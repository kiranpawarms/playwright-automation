import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { suppliers } from '../../test-data/po.data';

// CSV format mirrors the live SAMPLE FILE downloaded from
// /devadmin/Purchase_Orders/samplefile/. Tracking + invoice numbers are
// stamped with a per-run nonce so re-running doesn't trip uniqueness
// constraints on the importer.
function buildPoImportCsv(nonce: string): string {
  return [
    'BOX NO,SKU,PRICE,QTY,SHIPPING COST,TRACKING NO,PRODUCT NAME,HOLD,REMARKS,SHIPPING METHOD,INVOICE NO',
    `A1,107081016601,10.50,1,1520,DHL-${nonce}/A,,,,by_road,INV-${nonce}-1`,
    `A1,107082006503,1.75,2,,FedEx-${nonce}/A`,
    `A1,,11.75,5,,FedEx-${nonce}/B,Custom Product Name,1,Office use only`,
  ].join('\n');
}

test.describe('Purchase Order - Import', () => {
  test('TC_PO_011: Verify PO import via CSV creates a new PO', async ({ page }) => {
    test.setTimeout(180_000);
    const poPage = new PurchaseOrderPage(page);
    const supplierName = suppliers.shanwei.name; // "026-Shanwei Hengweiye Technology Co., Ltd"
    const nonce = Date.now().toString().slice(-8);

    let topPoNumBefore = '';

    await test.step('Snapshot top-of-grid PO number before import', async () => {
      await poPage.navigateToGrid();
      const editLinks = page.locator('a[href*="Purchase_Orders/Edit/po_num/"]');
      await editLinks.first().waitFor({ state: 'attached', timeout: 20000 });
      const href = (await editLinks.first().getAttribute('href')) || '';
      const m = href.match(/po_num\/(\d+)/);
      expect(m, 'Should be able to read top row po_num before import').toBeTruthy();
      topPoNumBefore = m![1];
      console.log(`Top-of-grid po_num before import: ${topPoNumBefore}`);
    });

    await test.step('Open Import Orders page', async () => {
      await page.getByRole('button', { name: /Import Orders/i }).first().click();
      await page.waitForURL(/Purchase_Orders\/import\//, { timeout: 20000 });
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step(`Pick supplier "${supplierName}" via the selectize widget`, async () => {
      // The supplier <select id="supplier"> is decorated by Selectize, which
      // hides the native select and exposes a text input #supplier-selectized.
      // Click the visible widget, type, and choose the matching dropdown row.
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

      // Confirm the underlying native select committed the value.
      const selectedText = await page
        .locator('#supplier option:checked')
        .evaluate((el) => (el.textContent || '').trim())
        .catch(() => '');
      console.log(`Supplier committed: "${selectedText}"`);
      expect(selectedText, 'Native supplier select should hold the chosen supplier').toContain('Shanwei');
    });

    await test.step('Upload the PO_IMPORT.csv (in-memory buffer)', async () => {
      const csv = buildPoImportCsv(nonce);
      console.log(`Uploading CSV (${csv.length} bytes), nonce=${nonce}`);

      // The page hosts three import forms (PO / Shipping Cost / Bulk Deliver),
      // each with id="upload_file". Scope to the PO-import form, identified
      // by the only form that contains the supplier select.
      const poImportFileInput = page.locator('form:has(#supplier) #upload_file');
      await expect(poImportFileInput, 'Should resolve a single PO-import file input').toHaveCount(1);
      await poImportFileInput.setInputFiles({
        name: 'PO_IMPORT.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf8'),
      });
    });

    await test.step('Submit the Import form and wait for navigation', async () => {
      const importBtn = page.locator('button.saveimport', { hasText: /^Import$/i }).first();
      await expect(importBtn, 'Import submit button should exist').toBeVisible();

      await Promise.all([
        page.waitForResponse(
          (r) => /Purchase_Orders\/(importfile|List)/.test(r.url()) && r.request().method() !== 'OPTIONS',
          { timeout: 60000 },
        ),
        importBtn.click(),
      ]);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});
    });

    await test.step('Verify import succeeded — no error message + new PO visible on grid', async () => {
      console.log(`Post-submit URL: ${page.url()}`);

      const errorBlock = page.locator('.error-msg, ul.messages li.error-msg');
      await expect(
        errorBlock,
        'Import page should not surface an error message after upload',
      ).toHaveCount(0);

      // Land on the grid (importer typically redirects there). If we're still
      // on the import page after a successful save, navigate to grid manually.
      if (!/Purchase_Orders\/List/.test(page.url())) {
        await poPage.navigateToGrid();
      }

      const editLinks = page.locator('a[href*="Purchase_Orders/Edit/po_num/"]');
      await editLinks.first().waitFor({ state: 'attached', timeout: 20000 });

      // A new PO at top is the strongest signal that import created one.
      // Imported POs adopt the CSV's BOX NO as their reference (e.g. "A1")
      // rather than the auto-generated YYYYMMDDPO… format, so a date-prefix
      // assertion isn't reliable here.
      const topHrefAfter = (await editLinks.first().getAttribute('href')) || '';
      const m = topHrefAfter.match(/po_num\/(\d+)/);
      expect(m, 'Should be able to read top row po_num after import').toBeTruthy();
      const topPoNumAfter = m![1];
      console.log(`Top-of-grid po_num after import: ${topPoNumAfter}`);
      expect(
        Number(topPoNumAfter),
        `Import should create a new PO — top po_num should be greater than ${topPoNumBefore}`,
      ).toBeGreaterThan(Number(topPoNumBefore));

      const topRowText = (await editLinks.first().locator('xpath=ancestor::tr[1]').innerText()) || '';
      console.log(`Top row after import (truncated): ${topRowText.replace(/\s+/g, ' ').slice(0, 200)}`);
      expect(topRowText, 'Imported PO row should show the supplier we selected').toContain('Shanwei');
      expect(topRowText, 'Imported PO row should show status "Created"').toContain('Created');

      await page.screenshot({
        path: `screenshots/po-create/tc11-import-csv-${nonce}.png`,
        fullPage: true,
      });
    });
  });
});
