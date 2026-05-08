import { test, expect } from '@playwright/test';
import { CustomerPage } from '../../pages/customer.page';

test.describe('Customer Module - Manage Customers', () => {
  test('TC_CUST_001: Grid loads and shows expected columns', async ({ page }) => {
    const customerPage = new CustomerPage(page);

    await test.step('Navigate to Manage Customers grid', async () => {
      await customerPage.navigateToGrid();
      expect(
        page.url(),
        'URL should match the Manage Customers grid path',
      ).toMatch(/\/devadmin\/customer\/index\//);
    });

    await test.step('Verify grid has the essential column headers', async () => {
      const headers = await customerPage.getColumnHeaders();
      console.log(`Found ${headers.length} column headers: ${JSON.stringify(headers)}`);
      expect(
        headers.length,
        'Customer grid should render multiple column headers',
      ).toBeGreaterThanOrEqual(5);

      // Don't assert the full custom column list — Mobile Sentrix has ~26
      // columns and the set may evolve. Pin only the core columns that any
      // sensible customer grid must always carry.
      const essentialColumns = ['ID', 'Name', 'Email', 'Group', 'Action'];
      const lower = headers.map((h) => h.toLowerCase());
      for (const col of essentialColumns) {
        expect(lower, `Column "${col}" should be present`).toContain(col.toLowerCase());
      }
    });

    await test.step('Verify at least one customer row is rendered', async () => {
      const rowCount = await customerPage.gridRows.count();
      console.log(`Customer grid has ${rowCount} visible rows on the current page`);
      expect(
        rowCount,
        'Customer grid should display at least one row',
      ).toBeGreaterThan(0);
    });

    await page.screenshot({
      path: 'screenshots/customer/tc01-grid-loaded.png',
      fullPage: true,
    });
  });
});
