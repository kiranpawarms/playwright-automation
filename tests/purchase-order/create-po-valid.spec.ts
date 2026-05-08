import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';

test.describe('Purchase Order - Create PO with valid data', () => {
  test('TC-PO-CREATE-01: Verify PO creation with valid data', async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);

    await test.step('Navigate to Purchase Orders grid', async () => {
      await poPage.navigateToGrid();
    });

    await test.step('Open new PO form', async () => {
      await page.getByRole('button', { name: 'New' }).first().click();
      await page.waitForLoadState('networkidle');
    });

    const supplierSelect = page.locator('select#supplier, select[name="supplier"]').first();

    await test.step('Validate supplier is selected (valid data)', async () => {
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
      const selectedText = await supplierSelect
        .locator('option:checked')
        .evaluate((el) => (el.textContent || '').trim())
        .catch(() => '');
      console.log(`Supplier — value: "${selectedValue}", text: "${selectedText}"`);
      expect(selectedValue, 'Supplier must have a non-empty value').toBeTruthy();

      await page.screenshot({
        path: 'screenshots/po-create/tc01-form-filled.png',
        fullPage: true,
      });
    });

    await test.step('Save PO', async () => {
      await page
        .locator('[id="page:main-container"]')
        .getByRole('button', { name: 'Save' })
        .first()
        .click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify PO is Created with po_num in URL', async () => {
      await expect(
        page.getByRole('cell', { name: 'Created', exact: true }).first(),
        'Newly created PO should show status "Created"',
      ).toBeVisible({ timeout: 20000 });

      const url = page.url();
      const match = url.match(/po_num\/(\d+)/);
      expect(match, `Expected po_num in URL after save — got: ${url}`).toBeTruthy();
      const poNumber = match![1];
      console.log(`PO created — internal po_num: ${poNumber}`);

      await page.screenshot({
        path: `screenshots/po-create/tc01-created-${poNumber}.png`,
        fullPage: true,
      });
    });
  });
});
