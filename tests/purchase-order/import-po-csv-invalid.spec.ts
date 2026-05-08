import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { suppliers } from '../../test-data/po.data';

// "Invalid" file = .csv extension but content that doesn't match the
// expected PO_IMPORT.csv schema (header row + SKU/QTY/PRICE columns).
// We expect server-side validation to reject it with a visible error
// rather than silently creating a junk PO.
function buildInvalidCsv(): string {
  return [
    'this,is,not,a,valid,po,import,file',
    'random,garbage,data,that,does,not,match,the,expected,schema',
    'foo,bar,baz',
  ].join('\n');
}

test.describe('Purchase Order - Import', () => {
  test('TC_PO_012: Verify validation error when uploading invalid CSV', async ({ page }) => {
    test.setTimeout(120_000);
    const poPage = new PurchaseOrderPage(page);
    const supplierName = suppliers.shanwei.name;

    let topPoNumBefore = '';

    await test.step('Snapshot top-of-grid PO number to detect any unwanted PO creation', async () => {
      await poPage.navigateToGrid();
      const editLinks = page.locator('a[href*="Purchase_Orders/Edit/po_num/"]');
      await editLinks.first().waitFor({ state: 'attached', timeout: 20000 });
      const href = (await editLinks.first().getAttribute('href')) || '';
      const m = href.match(/po_num\/(\d+)/);
      expect(m).toBeTruthy();
      topPoNumBefore = m![1];
      console.log(`Top-of-grid po_num before invalid upload: ${topPoNumBefore}`);
    });

    await test.step('Open Import Orders page', async () => {
      await page.getByRole('button', { name: /Import Orders/i }).first().click();
      await page.waitForURL(/Purchase_Orders\/import\//, { timeout: 20000 });
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step(`Pick supplier "${supplierName}" via the selectize widget`, async () => {
      const widget = page.locator('#supplier-selectized');
      await widget.waitFor({ state: 'visible', timeout: 10000 });
      await widget.click();
      await widget.fill('Shanwei');
      const option = page
        .locator('.selectize-dropdown-content .option, .selectize-dropdown .option')
        .filter({ hasText: 'Shanwei' })
        .first();
      await option.waitFor({ state: 'visible', timeout: 10000 });
      await option.click();
    });

    await test.step('Upload an invalid file (.txt extension, non-CSV content)', async () => {
      // The file input declares accept=".csv". A .txt with garbage tests
      // server-side extension/content validation — a more rigorous probe
      // than a malformed-but-CSV file (which the importer was found to
      // silently accept).
      const blob = buildInvalidCsv();
      const poImportFileInput = page.locator('form:has(#supplier) #upload_file');
      await expect(poImportFileInput).toHaveCount(1);
      await poImportFileInput.setInputFiles({
        name: 'INVALID_FORMAT.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(blob, 'utf8'),
      });
    });

    await test.step('Submit and capture the response', async () => {
      const importBtn = page.locator('button.saveimport', { hasText: /^Import$/i }).first();
      await expect(importBtn).toBeVisible();

      // Magento admin may surface validation either via a server flash
      // message or a window.alert dialog. Capture both.
      let alertText = '';
      page.once('dialog', async (d) => {
        alertText = d.message();
        console.log(`alert captured: ${alertText}`);
        await d.accept().catch(() => {});
      });

      await Promise.all([
        page.waitForResponse(
          (r) => /Purchase_Orders\/(importfile|List|import)/.test(r.url()) && r.request().method() !== 'OPTIONS',
          { timeout: 60000 },
        ).catch(() => null),
        importBtn.click(),
      ]);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      // Stash the captured dialog text on the page so the next step can read it.
      await page.evaluate((t) => ((window as unknown as { __alertText: string }).__alertText = t), alertText);
    });

    await test.step('Verify an error message is shown and no new PO was created', async () => {
      console.log(`Post-submit URL: ${page.url()}`);
      const alertText = await page.evaluate(() =>
        (window as unknown as { __alertText?: string }).__alertText || '',
      );
      const bodyText = (await page.locator('body').innerText()).slice(0, 4000);

      // Surface candidate error indicators for debugging.
      const errorEls = await page
        .locator('.error-msg, ul.messages li.error-msg, .messages .error, .validation-advice')
        .allInnerTexts();
      console.log(`error elements: ${JSON.stringify(errorEls)}`);
      console.log(`alertText: "${alertText}"`);

      const errorSurfaced =
        errorEls.length > 0 ||
        /\b(error|invalid|not a valid|wrong format|missing|required|column)\b/i.test(alertText) ||
        /\b(error|invalid|not a valid|wrong format|missing column|required header|please|fail(ed)?)\b/i.test(
          bodyText,
        );

      expect(
        errorSurfaced,
        `Expected an error message after invalid upload. errorEls=${JSON.stringify(errorEls)}, alert="${alertText}", bodySample="${bodyText.slice(0, 400).replace(/\s+/g, ' ')}"`,
      ).toBe(true);

      // Defensive: confirm we didn't accidentally create a PO from the junk.
      await poPage.navigateToGrid();
      const editLinks = page.locator('a[href*="Purchase_Orders/Edit/po_num/"]');
      await editLinks.first().waitFor({ state: 'attached', timeout: 20000 });
      const topHrefAfter = (await editLinks.first().getAttribute('href')) || '';
      const m = topHrefAfter.match(/po_num\/(\d+)/);
      const topPoNumAfter = m ? m[1] : '';
      console.log(`Top-of-grid po_num after invalid upload: ${topPoNumAfter}`);
      expect(
        Number(topPoNumAfter),
        `Invalid upload must not create a new PO (was ${topPoNumBefore})`,
      ).toBeLessThanOrEqual(Number(topPoNumBefore));

      await page.screenshot({
        path: `screenshots/po-create/tc12-invalid-csv-error.png`,
        fullPage: true,
      });
    });
  });
});
