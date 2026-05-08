import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { productQty } from '../../test-data/po.data';

test.describe('Purchase Order - SKU Handling', () => {
  test('TC-PO-006: Verify SKU can be added via search', async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);
    let poNumber = '';
    let poEditUrl = '';
    let selectedSku = '';

    await test.step('Navigate to Purchase Orders grid', async () => {
      await poPage.navigateToGrid();
    });

    await test.step('Open new PO form', async () => {
      await page.getByRole('button', { name: 'New' }).first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Validate supplier is selected', async () => {
      const supplierSelect = page.locator('select#supplier, select[name="supplier"]').first();
      await supplierSelect.waitFor({ state: 'attached', timeout: 15000 });

      let selectedValue = await supplierSelect.inputValue();
      if (!selectedValue) {
        const firstRealOptionValue = await supplierSelect
          .locator('option')
          .evaluateAll((opts) => {
            const real = (opts as HTMLOptionElement[]).find(
              (o) => o.value && !/select/i.test((o.textContent || '').trim()),
            );
            return real ? real.value : null;
          });
        expect(firstRealOptionValue, 'Supplier dropdown should have a selectable option').toBeTruthy();
        await supplierSelect.selectOption(firstRealOptionValue!);
        selectedValue = await supplierSelect.inputValue();
      }
      expect(selectedValue, 'Supplier must have a non-empty value').toBeTruthy();
    });

    await test.step('Save PO and capture po_num', async () => {
      await page
        .locator('[id="page:main-container"]')
        .getByRole('button', { name: 'Save' })
        .first()
        .click();
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('cell', { name: 'Created', exact: true }).first(),
        'Newly created PO should show status "Created"',
      ).toBeVisible({ timeout: 20000 });

      poEditUrl = page.url();
      const match = poEditUrl.match(/po_num\/(\d+)/);
      expect(match, `Expected po_num in URL after save — got: ${poEditUrl}`).toBeTruthy();
      poNumber = match![1];
      console.log(`PO created — internal po_num: ${poNumber}`);
    });

    await test.step('Open Add Products and search by stock filter', async () => {
      await page
        .getByRole('link', { name: /Add Products/i })
        .first()
        .click();
      await page.waitForLoadState('networkidle');

      await page
        .locator('#ProductSelection_filter_stock_summary_from')
        .fill(productQty.stockSummaryFrom);
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Select first matching SKU and set order quantity', async () => {
      const productRows = page.locator('tr:has(input[name="qty"])');
      const totalRows = await productRows.count();
      expect(totalRows, 'Search must return at least one product row').toBeGreaterThanOrEqual(1);

      const row = productRows.first();
      selectedSku = (await row.locator('td').nth(4).innerText()).trim();
      expect(selectedSku, 'Row must expose a non-empty SKU').toBeTruthy();
      console.log(`Selected SKU via search: ${selectedSku}`);

      await row.locator('input[type="checkbox"]').first().check();
      await row.locator('input[name="qty"]').fill(productQty.orderQty);

      await page
        .locator('#content')
        .getByRole('button', { name: 'Save' })
        .click();
      await page.waitForURL(/po_num\/\d+/, { timeout: 60000 });
    });

    await test.step('Reopen PO and verify SKU is added with correct details', async () => {
      await page.goto(poEditUrl);
      await page.waitForLoadState('domcontentloaded');

      const html = await page.content();
      expect(html, `SKU ${selectedSku} should be present on the PO edit page`).toContain(selectedSku);
      expect(html, `Order qty ${productQty.orderQty} should be present on the PO edit page`).toContain(
        productQty.orderQty,
      );

      await page.screenshot({
        path: `screenshots/po-create/tc06-sku-via-search-${poNumber}.png`,
        fullPage: true,
      });
    });
  });
});
