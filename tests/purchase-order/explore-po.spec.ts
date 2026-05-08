import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';
import { poCategories } from '../../test-data/po.data';

test.describe('Purchase Order - Explore PO Create Flow', () => {
  let poPage: PurchaseOrderPage;

  test.beforeEach(async ({ page }) => {
    poPage = new PurchaseOrderPage(page);
  });

  test('should login, navigate to PO, expand IPHONE > LCD, and verify UI elements', async ({ page }) => {
    await poPage.navigateToCreateNewOrder();
    await poPage.verifyPageLoaded();

    await poPage.expandCategory(poCategories.iphone);
    const lcdSubcat = page.locator('.poacc_inner_head[data-class="lcd"]').first();
    await expect(lcdSubcat).toBeVisible();

    const ajaxPromise = page.waitForResponse(
      (resp) => resp.url().includes('displayproducts'),
      { timeout: 15000 }
    );
    await poPage.expandSubcategory(poCategories.lcd);
    const response = await ajaxPromise;
    expect(response.status()).toBe(200);

    await page.screenshot({ path: 'screenshots/purchase-order/po-iphone-lcd-expanded.png', fullPage: true });

    const lcdToggle = lcdSubcat.locator('.poinnerplmin');
    await expect(lcdToggle).toHaveText('-');

    const lcdRow = page.locator('.my_row:has(.poacc_inner_head[data-class="lcd"])').first();
    const lcdInnerBody = lcdRow.locator('.poacc_inner_body');
    await expect(lcdInnerBody).toBeAttached();

    const displayStyle = await lcdInnerBody.evaluate(el => getComputedStyle(el).display);
    expect(displayStyle).not.toBe('none');
    console.log(`LCD inner body display: ${displayStyle}`);

    const bodyHtml = await lcdInnerBody.innerHTML();
    console.log(`LCD products loaded: ${bodyHtml.length > 0 ? 'yes' : 'no (empty in dev)'}`);

    const catSaveBtn = lcdSubcat.locator('button.savecatdata');
    await expect(catSaveBtn).toBeVisible();
    await expect(catSaveBtn).toHaveAttribute('title', 'Save');

    const saveBtn = page.getByRole('button', { name: 'Save Order' });
    await expect(saveBtn).toBeVisible();
  });
});
