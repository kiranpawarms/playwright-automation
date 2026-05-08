import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';

test.describe('Purchase Order - Validation', () => {
  test('TC-PO-VAL-01: Verify error when supplier is not selected', async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);

    await test.step('Navigate to Purchase Orders grid', async () => {
      await poPage.navigateToGrid();
    });

    await test.step('Open new PO form', async () => {
      await page.getByRole('button', { name: 'New' }).first().click();
      await page.waitForLoadState('networkidle');
    });

    const supplierSelect = page.locator('select#supplier, select[name="supplier"]').first();

    await test.step('Force supplier to be unselected', async () => {
      await supplierSelect.waitFor({ state: 'attached', timeout: 15000 });
      await supplierSelect.evaluate((el: HTMLSelectElement) => {
        el.value = '';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(await supplierSelect.inputValue(), 'Supplier value must be empty before submitting').toBe('');
    });

    await test.step('Submit PO without supplier', async () => {
      page.once('dialog', (d) => d.accept().catch(() => {}));
      await page
        .locator('[id="page:main-container"]')
        .getByRole('button', { name: 'Save' })
        .first()
        .click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify "Supplier not selected." error and that PO was not created', async () => {
      expect(
        /po_num\/\d+/.test(page.url()),
        `PO should NOT have been created, but URL contains po_num: ${page.url()}`,
      ).toBe(false);

      const errorMsg = page.locator('li.error-msg', { hasText: 'Supplier not selected.' }).first();
      await expect(errorMsg, 'Server-side validation message must be visible').toBeVisible({
        timeout: 10000,
      });

      await page.screenshot({
        path: 'screenshots/po-create/no-supplier-validation.png',
        fullPage: true,
      });
    });
  });
});
