import { test, expect } from '@playwright/test';
import { CustomerPage } from '../../pages/customer.page';

test.describe('Customer Module - Manage Customers Total Count', () => {
  test('TC_CUST_003: Verify total customer count in grid is consistent across navigation', async ({
    page,
  }) => {
    const customerPage = new CustomerPage(page);
    const pageSize = 20;

    await test.step('Open the Manage Customers grid', async () => {
      await customerPage.navigateToGrid();
    });

    let total = 0;
    await test.step('Read total customer count from the grid', async () => {
      total = await customerPage.getTotalCount();
      console.log(`Grid reports total customers: ${total}`);
      expect(total, 'Grid should report a positive total customer count').toBeGreaterThan(0);
    });

    await test.step(`Set page size to ${pageSize}`, async () => {
      await customerPage.setPageSize(pageSize);
    });

    const expectedPages = Math.ceil(total / pageSize);
    await test.step('Verify pager-reported total pages matches ceil(total / pageSize)', async () => {
      const reportedPages = await customerPage.getTotalPages();
      console.log(
        `Pager reports ${reportedPages} pages; expected ${expectedPages} (= ceil(${total} / ${pageSize}))`,
      );
      expect(
        reportedPages,
        `Total pages should equal ceil(${total} / ${pageSize}) = ${expectedPages}`,
      ).toBe(expectedPages);
    });

    let page1Ids: string[] = [];
    await test.step('Verify page 1 renders a full page of records', async () => {
      const rowCount = await customerPage.gridRows.count();
      console.log(`Page 1 row count: ${rowCount}`);
      const expectedFirstPage = expectedPages === 1 ? total : pageSize;
      expect(rowCount, `Page 1 should render ${expectedFirstPage} rows`).toBe(expectedFirstPage);
      page1Ids = await customerPage.getRowIds();
    });

    if (expectedPages > 1) {
      await test.step('Navigate to page 2 and verify a full, non-overlapping page', async () => {
        await customerPage.goToNextPage();
        const page2Ids = await customerPage.getRowIds();
        console.log(`Page 2 row count: ${page2Ids.length}`);
        const expectedSecondPage = expectedPages === 2 ? total - pageSize : pageSize;
        expect(
          page2Ids,
          `Page 2 should render ${expectedSecondPage} rows`,
        ).toHaveLength(expectedSecondPage);

        const overlap = page2Ids.filter((id) => page1Ids.includes(id));
        expect(
          overlap,
          `Page 2 must not repeat page-1 records, but found overlap: ${overlap.join(', ')}`,
        ).toHaveLength(0);
      });

      await test.step('Reconfirm total count is unchanged after navigation', async () => {
        const totalAfter = await customerPage.getTotalCount();
        expect(
          totalAfter,
          'Total customer count should remain stable across pagination',
        ).toBe(total);
      });
    }

    await page.screenshot({
      path: 'screenshots/customer/tc03-total-count.png',
      fullPage: true,
    });
  });
});
