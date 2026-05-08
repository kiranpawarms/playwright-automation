import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { productQty } from '../../test-data/po.data';

test.describe('Purchase Order - SKU Handling', () => {
  test('TC_PO_007: Verify SKU removal from PO', async ({ page }) => {
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

    await test.step('Add a SKU via Add Products → search → save', async () => {
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

      const productRows = page.locator('tr:has(input[name="qty"])');
      const totalRows = await productRows.count();
      expect(totalRows, 'Search must return at least one product row').toBeGreaterThanOrEqual(1);

      const row = productRows.first();
      selectedSku = (await row.locator('td').nth(4).innerText()).trim();
      expect(selectedSku, 'Row must expose a non-empty SKU').toBeTruthy();
      console.log(`SKU added for removal test: ${selectedSku}`);

      await row.locator('input[type="checkbox"]').first().check();
      await row.locator('input[name="qty"]').fill(productQty.orderQty);

      await page
        .locator('#content')
        .getByRole('button', { name: 'Save' })
        .click();
      await page.waitForURL(/po_num\/\d+/, { timeout: 60000 });
    });

    await test.step('Confirm SKU is on the PO before removal', async () => {
      await page.goto(poEditUrl);
      await page.waitForLoadState('domcontentloaded');
      const html = await page.content();
      expect(html, `Pre-condition: SKU ${selectedSku} should be on the PO before removal`).toContain(
        selectedSku,
      );
    });

    let productId = '';
    await test.step('Tick per-row delete checkbox for the added SKU', async () => {
      // Each line item exposes inputs named `<field>_<product_id>` (e.g.
      // `delivery_qty_3104364`, `remaining_qty_3104364`) and a removal
      // checkbox named `delete_<product_id>`. Resolve product_id from any
      // input in the row that contains the SKU.
      productId = await page.evaluate((sku) => {
        const rows = Array.from(document.querySelectorAll('tr')) as HTMLTableRowElement[];
        for (const r of rows) {
          if (!r.textContent?.includes(sku)) continue;
          const inputs = r.querySelectorAll('input[name]');
          for (const i of inputs) {
            const m = (i as HTMLInputElement).name.match(/_(\d+)$/);
            if (m) return m[1];
          }
        }
        return '';
      }, selectedSku);
      expect(productId, `Should resolve product_id from SKU row for ${selectedSku}`).toMatch(/^\d+$/);
      console.log(`Resolved product_id for ${selectedSku}: ${productId}`);

      const deleteCheckbox = page.locator(`#delete_${productId}`);
      await expect(deleteCheckbox, `delete_${productId} checkbox should exist`).toHaveCount(1);

      // Checkbox is rendered inside a collapsed PO accordion (display:none on
      // the parent), so a normal click times out on visibility. Set the
      // property directly and fire the onclick handler so the persistant
      // grid records the change for the form submit.
      await deleteCheckbox.evaluate((el) => {
        const cb = el as HTMLInputElement;
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        if (typeof (cb as unknown as { onclick: () => void }).onclick === 'function') {
          (cb as unknown as { onclick: () => void }).onclick();
        }
      });
      await expect(deleteCheckbox).toBeChecked();
    });

    await test.step('Save the PO to commit the removal', async () => {
      await page
        .locator('[id="page:main-container"]')
        .getByRole('button', { name: 'Save' })
        .first()
        .click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify SKU is no longer on the PO', async () => {
      await page.goto(poEditUrl);
      await page.waitForLoadState('domcontentloaded');

      const html = await page.content();
      expect(html, `SKU ${selectedSku} should be removed from PO ${poNumber}`).not.toContain(
        selectedSku,
      );
      await expect(
        page.locator(`#delete_${productId}`),
        `delete_${productId} checkbox should no longer be on the page`,
      ).toHaveCount(0);

      await page.screenshot({
        path: `screenshots/po-create/tc07-sku-removed-${poNumber}.png`,
        fullPage: true,
      });
    });
  });
});
