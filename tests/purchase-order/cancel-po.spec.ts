import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';

test.describe('Purchase Order - Workflow', () => {
  test('TC_PO_008: Verify PO cancellation', async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);
    let poNumber = '';
    let poEditUrl = '';

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
        'Newly created PO should show status "Created" before cancellation',
      ).toBeVisible({ timeout: 20000 });

      poEditUrl = page.url();
      const match = poEditUrl.match(/po_num\/(\d+)/);
      expect(match, `Expected po_num in URL after save — got: ${poEditUrl}`).toBeTruthy();
      poNumber = match![1];
      console.log(`PO created — internal po_num: ${poNumber}`);
    });

    await test.step('Click Cancel and accept any confirm dialog', async () => {
      // Magento admin uses window.confirm() for destructive workflow
      // actions (mirrors the Receive / Verify dialogs in po-lifecycle).
      page.on('dialog', (d) => d.accept().catch(() => {}));

      await page.getByRole('button', { name: 'Cancel', exact: true }).first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify status changed to Cancelled', async () => {
      // Reopen the edit page in case Cancel redirected to the grid.
      await page.goto(poEditUrl);
      await page.waitForLoadState('domcontentloaded');

      // After cancel, status shows in an "Order Status" row (e.g.
      // "Order Status CANCELED"). The value is uppercase American spelling
      // (one L) — accept both spellings/cases just in case.
      await expect(
        page.getByRole('row', { name: /Order Status\s+cancell?ed/i }).first(),
        `PO ${poNumber} should display Order Status = Cancelled after cancel`,
      ).toBeVisible({ timeout: 20000 });

      await page.screenshot({
        path: `screenshots/po-create/tc08-cancelled-${poNumber}.png`,
        fullPage: true,
      });
    });
  });
});
