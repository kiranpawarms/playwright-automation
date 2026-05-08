import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { poSearch } from '../../test-data/po.data';

test.describe('Purchase Order - Search', () => {
  test('TC_PO_009: Verify search by PO number returns the correct PO', async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);
    let poNumber = '';
    let poEditUrl = '';
    let poReference = '';

    await test.step('Create a fresh PO so we have a known reference to search for', async () => {
      await poPage.navigateToGrid();
      await page.getByRole('button', { name: 'New' }).first().click();
      await page.waitForLoadState('networkidle');

      const supplierSelect = page.locator('select#supplier, select[name="supplier"]').first();
      await supplierSelect.waitFor({ state: 'attached', timeout: 15000 });
      if (!(await supplierSelect.inputValue())) {
        const v = await supplierSelect.locator('option').evaluateAll((opts) => {
          const real = (opts as HTMLOptionElement[]).find(
            (o) => o.value && !/select/i.test((o.textContent || '').trim()),
          );
          return real ? real.value : null;
        });
        expect(v, 'Supplier dropdown should have a selectable option').toBeTruthy();
        await supplierSelect.selectOption(v!);
      }

      await page
        .locator('[id="page:main-container"]')
        .getByRole('button', { name: 'Save' })
        .first()
        .click();
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByRole('cell', { name: 'Created', exact: true }).first(),
      ).toBeVisible({ timeout: 20000 });

      poEditUrl = page.url();
      const m = poEditUrl.match(/po_num\/(\d+)/);
      expect(m, `Expected po_num in URL — got: ${poEditUrl}`).toBeTruthy();
      poNumber = m![1];
      console.log(`Created PO — po_num=${poNumber}`);
    });

    await test.step('Read the new PO’s Box ID / Reference from the grid', async () => {
      await poPage.navigateToGrid();
      const editLinkForOurPo = page.locator(`a[href*="Purchase_Orders/Edit/po_num/${poNumber}/"]`);
      await editLinkForOurPo.first().waitFor({ state: 'attached', timeout: 20000 });

      const ourRow = editLinkForOurPo.first().locator('xpath=ancestor::tr[1]');
      // Box ID / Reference is the first non-empty cell after the leading
      // "Select" checkbox column. Take the first whitespace-separated token
      // and strip the trailing "COPY"/"copied" affordance text.
      const cells: string[] = await ourRow.evaluate((row) =>
        Array.from(row.children).map((c) => (c.textContent || '').trim()),
      );
      const refCell = cells.find((c) => /\d{8}PO\d+/.test(c)) || '';
      const m = refCell.match(/(\d{8}PO\d+)/);
      expect(m, `Expected a Box ID/Reference like 20260507PO… in our row — got cells: ${JSON.stringify(cells)}`).toBeTruthy();
      poReference = m![1];
      console.log(`Reference for po_num ${poNumber}: ${poReference}`);
    });

    await test.step(`Apply exact-match filter "${poReference || '<ref>'}" and submit with Enter`, async () => {
      const refFilter = page.getByPlaceholder(poSearch.filterPlaceholder).first();
      await expect(refFilter).toBeVisible({ timeout: 10000 });
      await refFilter.click();
      await refFilter.fill(poSearch.exact(poReference));
      await expect(refFilter).toHaveValue(poSearch.exact(poReference));

      await Promise.all([
        page
          .waitForResponse((r) => r.url().includes('Purchase_Orders') && r.status() === 200, {
            timeout: 15000,
          })
          .catch(() => null),
        refFilter.press('Enter'),
      ]);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify exactly one row displayed and it points to our PO', async () => {
      const editLinks = page.locator('a[href*="Purchase_Orders/Edit/po_num/"]');
      await editLinks.first().waitFor({ state: 'attached', timeout: 15000 });

      const rowCount = await editLinks.locator('xpath=ancestor::tr[1]').count();
      expect(rowCount, `Exact-match search for ${poReference} should return a single row`).toBe(1);

      const ourLink = page.locator(`a[href*="Purchase_Orders/Edit/po_num/${poNumber}/"]`);
      await expect(
        ourLink.first(),
        `The single result row should link to our PO ${poNumber}`,
      ).toBeVisible();

      const rowText = (await editLinks.first().locator('xpath=ancestor::tr[1]').innerText()) || '';
      expect(rowText, `Result row should display reference ${poReference}`).toContain(poReference);

      await page.screenshot({
        path: `screenshots/po-search/tc09-search-by-number-${poReference}.png`,
        fullPage: true,
      });
    });
  });
});
