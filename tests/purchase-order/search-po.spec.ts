import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { poSearch } from '../../test-data/po.data';

test.describe('Purchase Order - Search in PO Grid', () => {
  test('TC-PO-SEARCH-01: Verify search PO in PO grid by Box ID/Reference', async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);
    const editLinks = page.locator('a[href*="Purchase_Orders/Edit/po_num/"]');
    const gridRows = editLinks.locator('xpath=ancestor::tr[1]');
    let totalBefore = 0;
    let poRef = '';

    await test.step('Navigate to Purchase Orders grid', async () => {
      await poPage.navigateToGrid();
      await editLinks.first().waitFor({ state: 'attached', timeout: 20000 });
    });

    await test.step('Capture first Box ID/Reference from grid', async () => {
      totalBefore = await gridRows.count();
      expect(totalBefore, 'PO grid should have at least one row before search').toBeGreaterThan(0);

      const firstRowText = (await gridRows.first().innerText()) || '';
      const firstToken = firstRowText.trim().split(/\s+/)[0] || '';
      poRef = firstToken.replace(/^[+\s]+/, '').trim();
      expect(poRef, 'Expected a Box ID/Reference value in the first row').toMatch(/\w/);
      console.log(`Searching PO grid by Box ID/Reference: "${poRef}"`);
    });

    await test.step(`Apply exact-match filter for "${poRef || '<first row ref>'}"`, async () => {
      const refFilter = page.getByPlaceholder(poSearch.filterPlaceholder).first();
      await expect(refFilter, 'Box ID/Reference filter input should be visible').toBeVisible({
        timeout: 10000,
      });
      await refFilter.click();
      await refFilter.fill(poSearch.exact(poRef));
      await expect(refFilter).toHaveValue(poSearch.exact(poRef));

      await Promise.all([
        page
          .waitForResponse((r) => r.url().includes('Purchase_Orders') && r.status() === 200, {
            timeout: 15000,
          })
          .catch(() => null),
        refFilter.press('Enter'),
      ]);
      await page.waitForLoadState('networkidle');
      await editLinks.first().waitFor({ state: 'attached', timeout: 15000 });
    });

    await test.step('Verify filtered results contain only searched reference', async () => {
      const rowsAfter = await gridRows.count();
      console.log(`Rows before: ${totalBefore}, rows after search: ${rowsAfter}`);
      expect(rowsAfter, 'Filtered grid should have at least one matching row').toBeGreaterThan(0);
      expect(rowsAfter, 'Filtered grid should not exceed pre-search row count').toBeLessThanOrEqual(
        totalBefore,
      );

      const rowTexts = await gridRows.evaluateAll((rows) =>
        rows.map((r) => (r.textContent || '').trim()),
      );
      for (const t of rowTexts) {
        expect(t, `Every visible row should contain searched reference "${poRef}"`).toContain(poRef);
      }

      await page.screenshot({
        path: `screenshots/po-search/search-${poRef}.png`,
        fullPage: true,
      });
    });
  });
});
