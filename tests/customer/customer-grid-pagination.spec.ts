import { test, expect } from '@playwright/test';
import { CustomerPage } from '../../pages/customer.page';

test.describe('Customer Module - Manage Customers Pagination', () => {
  test('TC_CUST_002: Page size 20 + Next page shows the next 20 records', async ({ page }) => {
    const customerPage = new CustomerPage(page);

    await test.step('Open the Manage Customers grid', async () => {
      await customerPage.navigateToGrid();
    });

    await test.step('Precondition: more than 20 customers exist', async () => {
      // Magento renders the total in a hidden span next to the pager.
      const totalText = await page.locator('#customerGrid-total-count').textContent();
      const total = Number((totalText || '').replace(/[^\d]/g, ''));
      console.log(`Total customers reported by grid: ${total}`);
      expect(total, 'Grid must have >20 customers to exercise pagination').toBeGreaterThan(20);
    });

    await test.step('Change page size to 20', async () => {
      await customerPage.setPageSize(20);
      const rowCount = await customerPage.gridRows.count();
      console.log(`Page 1 row count after setting size=20: ${rowCount}`);
      expect(rowCount, 'Page 1 should render exactly 20 rows').toBe(20);
    });

    let page1Ids: string[] = [];
    await test.step('Capture page 1 customer IDs', async () => {
      page1Ids = await customerPage.getRowIds();
      console.log(`Page 1 IDs: ${page1Ids.join(', ')}`);
      expect(page1Ids).toHaveLength(20);
      await page.screenshot({
        path: 'screenshots/customer/tc02-page1.png',
        fullPage: true,
      });
    });

    await test.step('Click Next page button', async () => {
      await customerPage.goToNextPage();
    });

    await test.step('Verify page 2 shows a different set of 20 records', async () => {
      const page2Ids = await customerPage.getRowIds();
      console.log(`Page 2 IDs: ${page2Ids.join(', ')}`);
      expect(page2Ids, 'Page 2 should render 20 rows').toHaveLength(20);

      // None of the page-1 IDs should appear on page 2.
      const overlap = page2Ids.filter((id) => page1Ids.includes(id));
      expect(
        overlap,
        `Page 2 must not repeat page-1 records, but found overlap: ${overlap.join(', ')}`,
      ).toHaveLength(0);

      await page.screenshot({
        path: 'screenshots/customer/tc02-page2.png',
        fullPage: true,
      });
    });
  });
});
