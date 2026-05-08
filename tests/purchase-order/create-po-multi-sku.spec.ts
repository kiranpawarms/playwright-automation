import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { productQty } from '../../test-data/po.data';

const SKU_COUNT = 3;

test.describe('Purchase Order - Create PO with multiple SKUs', () => {
  test('TC-PO-CREATE-MULTI-01: Verify PO creation with multiple SKUs', async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);
    let poNumber = '';
    let poEditUrl = '';
    const selectedSkus: string[] = [];

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

    await test.step('Open Add Products and filter to a populated set', async () => {
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

    await test.step(`Select ${SKU_COUNT} SKUs and set order quantity on each`, async () => {
      const productRows = page.locator('tr:has(input[name="qty"])');
      const totalRows = await productRows.count();
      expect(totalRows, 'Filter must return at least 3 product rows').toBeGreaterThanOrEqual(SKU_COUNT);

      for (let i = 0; i < SKU_COUNT; i++) {
        const row = productRows.nth(i);
        const sku = (await row.locator('td').nth(4).innerText()).trim();
        expect(sku, `Row ${i} must expose a non-empty SKU`).toBeTruthy();
        selectedSkus.push(sku);

        await row.locator('input[type="checkbox"]').first().check();
        await row.locator('input[name="qty"]').fill(productQty.orderQty);
      }
      console.log(`Selected SKUs: ${selectedSkus.join(', ')}`);

      await page
        .locator('#content')
        .getByRole('button', { name: 'Save' })
        .click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Reopen PO and verify all selected SKUs are listed', async () => {
      await page.goto(poEditUrl);
      await page.waitForLoadState('networkidle');

      const html = await page.content();
      for (const sku of selectedSkus) {
        expect(html, `SKU ${sku} should be present on the PO edit page`).toContain(sku);
      }

      await page.screenshot({
        path: `screenshots/po-create/multi-sku-${poNumber}.png`,
        fullPage: true,
      });
    });
  });
});
