import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';

test.describe('Purchase Order - Validation', () => {
  test('TC_PO_004: Verify error when SKU is not added', async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);
    let poEditUrl = '';

    await test.step('Navigate to Purchase Orders grid', async () => {
      await poPage.navigateToGrid();
    });

    await test.step('Open new PO form', async () => {
      await page.getByRole('button', { name: 'New' }).first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Save PO with supplier (no SKUs added)', async () => {
      const supplierSelect = page.locator('select#supplier, select[name="supplier"]').first();
      await supplierSelect.waitFor({ state: 'attached', timeout: 15000 });
      const value = await supplierSelect.inputValue();
      expect(value, 'Supplier must be selected before save').toBeTruthy();

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
      expect(/po_num\/\d+/.test(poEditUrl), `Expected po_num in URL: ${poEditUrl}`).toBe(true);
    });

    await test.step('Attempt to Receive PO without any SKU', async () => {
      page.once('dialog', (d) => d.accept().catch(() => {}));
      await page.getByRole('button', { name: 'Receive' }).click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify "Please add the product" error is displayed and PO is not Received', async () => {
      const errorMsg = page
        .locator('li.error-msg', { hasText: /Please add the product to proceed further/i })
        .first();
      await expect(errorMsg, 'Server-side validation message must be visible').toBeVisible({
        timeout: 10000,
      });

      await expect(
        page.getByRole('cell', { name: 'Received', exact: true }).first(),
        'PO should NOT have moved to Received status',
      ).toHaveCount(0);

      await page.screenshot({
        path: 'screenshots/po-create/no-sku-validation.png',
        fullPage: true,
      });
    });
  });
});
