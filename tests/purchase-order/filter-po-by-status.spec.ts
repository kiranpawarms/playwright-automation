import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { poSearch } from '../../test-data/po.data';

// "Approved" is not a valid PO Order Status in this app. Per probe of the
// po_status filter, valid values are: Complete, Created, Lost, On Hold,
// Partial Delivery, Received. We substitute "Created" because every fresh
// PO lands in that state, giving us a guaranteed match to assert against.
const FILTER_STATUS = 'Created';

test.describe('Purchase Order - Search', () => {
  test(`TC_PO_010: Filter PO grid by status — only ${FILTER_STATUS} POs are shown`, async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);
    let poNumber = '';

    await test.step('Create a fresh PO so a known matching row exists', async () => {
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
        'Newly created PO should land in status "Created"',
      ).toBeVisible({ timeout: 20000 });

      const m = page.url().match(/po_num\/(\d+)/);
      expect(m).toBeTruthy();
      poNumber = m![1];
      console.log(`Seeded PO — po_num=${poNumber}`);
    });

    await test.step(`Apply po_status multi-select filter = "${FILTER_STATUS}"`, async () => {
      await poPage.navigateToGrid();
      await page.locator('a[href*="Purchase_Orders/Edit/po_num/"]').first().waitFor({ state: 'attached', timeout: 20000 });

      // The PO Order Status column has a native <select multiple> backing
      // a custom dropdown widget. Set the native select directly, dispatch
      // change so any wired-up listeners pick it up, then commit the filter
      // by pressing Enter on the Box ID / Reference text input (memory:
      // pressing Enter submits the grid filter; the visible Search button
      // does not).
      const statusSelect = page.locator('#PurchaseOrderGrid_filter_po_status');
      await expect(statusSelect, 'po_status multi-select should be in the DOM').toHaveCount(1);
      await statusSelect.selectOption({ label: FILTER_STATUS });
      await statusSelect.evaluate((el) => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const refFilter = page.getByPlaceholder(poSearch.filterPlaceholder).first();
      await refFilter.click();
      await Promise.all([
        page
          .waitForResponse((r) => r.url().includes('Purchase_Orders') && r.status() === 200, {
            timeout: 20000,
          })
          .catch(() => null),
        refFilter.press('Enter'),
      ]);
      await page.waitForLoadState('networkidle');
      await page.locator('a[href*="Purchase_Orders/Edit/po_num/"]').first().waitFor({ state: 'attached', timeout: 20000 });
    });

    await test.step(`Verify every visible row's PO Order Status is "${FILTER_STATUS}"`, async () => {
      const editLinks = page.locator('a[href*="Purchase_Orders/Edit/po_num/"]');
      const rows = editLinks.locator('xpath=ancestor::tr[1]');
      const rowCount = await rows.count();
      expect(rowCount, 'Filtered grid should have at least one row').toBeGreaterThan(0);
      console.log(`Filtered grid: ${rowCount} rows on the current page`);

      // PO Order Status is column index 9 (0-based) per the grid headers
      // captured earlier: ["Select","Box ID / Reference","Created Date",
      // "Received Date","Expected Delivery Date","Delivery Date",
      // "Supplier Name","Supplier Code","Warehouse","PO Order Status",...].
      // Assert via column text rather than cell index in case columns are
      // reordered: locate the index dynamically from the header row.
      const statusColIndex = await page.evaluate(() => {
        const ths = Array.from(document.querySelectorAll('table thead th'));
        return ths.findIndex((th) => /PO Order Status/i.test((th.textContent || '').trim()));
      });
      expect(statusColIndex, 'PO Order Status column should exist in the grid').toBeGreaterThanOrEqual(0);

      const statusTexts = await rows.evaluateAll(
        (rs, idx) => rs.map((r) => ((r.children[idx] as HTMLElement | undefined)?.textContent || '').trim()),
        statusColIndex,
      );
      console.log(`Sample status texts (first 5): ${JSON.stringify(statusTexts.slice(0, 5))}`);
      for (const s of statusTexts) {
        expect(s, `Every visible row's PO Order Status should be "${FILTER_STATUS}"`).toContain(FILTER_STATUS);
      }

      // Bonus: our seeded PO should be on this page (it's brand new, sorts to top).
      const ourLink = page.locator(`a[href*="Purchase_Orders/Edit/po_num/${poNumber}/"]`);
      await expect(
        ourLink.first(),
        `Newly-created PO ${poNumber} should appear in the filtered ${FILTER_STATUS} list`,
      ).toBeVisible();

      await page.screenshot({
        path: `screenshots/po-search/tc10-status-filter-${FILTER_STATUS}.png`,
        fullPage: true,
      });
    });
  });
});
