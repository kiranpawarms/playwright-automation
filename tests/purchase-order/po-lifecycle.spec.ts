import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { productQty } from '../../test-data/po.data';

let poNumber: string;
let poEditUrl: string;

test.describe.serial('Purchase Order - Full Lifecycle (Created → Received → Verified)', () => {
  test('TC-PO-01: Create PO with supplier → status Created', async ({ page }) => {
    const poPage = new PurchaseOrderPage(page);

    await test.step('Navigate to Purchase Orders grid', async () => {
      await poPage.navigateToGrid();
    });

    await test.step('Open new PO form', async () => {
      await page.getByRole('button', { name: 'New' }).click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: 'screenshots/po-lifecycle/tc01-new-form.png',
        fullPage: true,
      });
    });

    await test.step('Validate supplier is selected', async () => {
      const supplierSelect = page.locator('select#supplier, select[name="supplier"]').first();
      await supplierSelect.waitFor({ state: 'attached', timeout: 15000 });
      const selectedValue = await supplierSelect.inputValue();
      const selectedText = await supplierSelect
        .locator('option:checked')
        .evaluate((el) => (el.textContent || '').trim())
        .catch(() => '');
      console.log(`Supplier — value: "${selectedValue}", text: "${selectedText}"`);
      expect(selectedValue, 'Supplier dropdown should have a selected value').toBeTruthy();
    });

    await test.step('Save PO', async () => {
      await page
        .locator('[id="page:main-container"]')
        .getByRole('button', { name: 'Save' })
        .click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify PO status is Created and capture po_num', async () => {
      await expect(
        page.getByRole('cell', { name: 'Created', exact: true }).first()
      ).toBeVisible({ timeout: 15000 });

      const url = page.url();
      const match = url.match(/po_num\/(\d+)/);
      expect(match, `Expected po_num in URL — got: ${url}`).toBeTruthy();
      poNumber = match![1];
      poEditUrl = url;
      console.log(`PO created — number: ${poNumber}`);

      await page.screenshot({
        path: `screenshots/po-lifecycle/tc01-created-${poNumber}.png`,
        fullPage: true,
      });
    });
  });

  test('TC-PO-02: Add products → Receive → status Received', async ({ page }) => {
    expect(poEditUrl, 'TC-PO-01 must have captured PO URL').toBeTruthy();

    await test.step('Open the created PO', async () => {
      await page.goto(poEditUrl);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Go to Add Products and filter by stock summary', async () => {
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

    await test.step('Select first product and set order quantity', async () => {
      const firstProductRow = page.locator('tr:has(input[name="qty"])').first();
      await firstProductRow.waitFor({ state: 'visible', timeout: 15000 });
      await firstProductRow.locator('input[type="checkbox"]').first().check();
      await firstProductRow.locator('input[name="qty"]').fill(productQty.orderQty);

      await page
        .locator('#content')
        .getByRole('button', { name: 'Save' })
        .click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Receive PO', async () => {
      await page.goto(poEditUrl);
      await page.waitForLoadState('networkidle');
      page.on('dialog', (d) => d.accept().catch(() => {}));
      await page.getByRole('button', { name: 'Receive' }).click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify PO status is Received', async () => {
      await expect(
        page.getByRole('cell', { name: 'Received', exact: true }).first()
      ).toBeVisible({ timeout: 20000 });

      await page.screenshot({
        path: `screenshots/po-lifecycle/tc02-received-${poNumber}.png`,
        fullPage: true,
      });
    });
  });

  test('TC-PO-03: Verify deliveries → status Verified', async ({ page }) => {
    expect(poEditUrl, 'TC-PO-01 must have captured PO URL').toBeTruthy();

    await test.step('Open the created PO and go to Deliveries tab', async () => {
      await page.goto(poEditUrl);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('link', { name: /Deliveries.*Verify/i })
        .first()
        .click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Tick all VERIFY BOX QTY(S) checkboxes', async () => {
      const verifyCheckboxes = page.getByRole('checkbox', {
        name: 'VERIFY BOX QTY(S)',
      });
      const count = await verifyCheckboxes.count();
      console.log(`Found ${count} VERIFY BOX QTY(S) checkbox(es)`);
      for (let i = 0; i < count; i++) {
        await verifyCheckboxes.nth(i).check();
      }
    });

    await test.step('Click "All products verified" and save', async () => {
      page.once('dialog', (d) => d.accept().catch(() => {}));
      await page.getByRole('button', { name: 'All products verified' }).click();
      await page.waitForLoadState('networkidle');

      page.once('dialog', (d) => d.accept().catch(() => {}));
      await page
        .locator('#content')
        .getByRole('button', { name: 'Save' })
        .click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify PO status is Verified', async () => {
      await expect(
        page.getByRole('cell', { name: 'Verified', exact: true }).first()
      ).toBeVisible({ timeout: 20000 });

      await page.screenshot({
        path: `screenshots/po-lifecycle/tc03-verified-${poNumber}.png`,
        fullPage: true,
      });
    });
  });
});
