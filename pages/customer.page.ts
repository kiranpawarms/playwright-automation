import { Page, Locator, expect } from '@playwright/test';
import { gotoCustomerGrid } from '../utils/customer-navigation';

export class CustomerPage {
  /**
   * The grid's <thead> contains two rows: row 1 = column headers, row 2 = per-column
   * filter inputs/dropdowns. We only want the labels from the first row.
   */
  readonly headerCells: Locator;
  readonly gridRows: Locator;
  readonly pageSizeSelect: Locator;
  readonly nextPageButton: Locator;
  readonly pageInput: Locator;

  constructor(private page: Page) {
    // Scope to #customerGrid_table — there are several other tables on the page
    // (filters, mass-action, layout). The grid table is the only one carrying data rows.
    this.headerCells = page.locator('#customerGrid_table thead tr').first().locator('th');
    this.gridRows = page.locator('#customerGrid_table tbody tr');
    this.pageSizeSelect = page.locator('td.pager select[name="limit"]');
    this.nextPageButton = page.locator('td.pager a[title="Next page"]');
    this.pageInput = page.locator('td.pager input[name="page"]');
  }

  async navigateToGrid(): Promise<void> {
    await gotoCustomerGrid(this.page);
  }

  async getColumnHeaders(): Promise<string[]> {
    return this.headerCells.evaluateAll((ths) =>
      ths.map((th) => (th.textContent || '').trim()).filter(Boolean),
    );
  }

  /**
   * Set the grid page size. The <select> dispatches loadByElement on change,
   * which triggers an AJAX reload — we wait for the page input to reset to 1.
   */
  async setPageSize(size: number): Promise<void> {
    await this.pageSizeSelect.selectOption(String(size));
    // Changing page size resets the grid to page 1.
    await expect(this.pageInput).toHaveValue('1', { timeout: 15000 });
    await expect(this.pageSizeSelect).toHaveValue(String(size));
  }

  /**
   * Return the customer IDs from the current page. The ID column is the 3rd cell
   * (after Select checkbox + Store), and its text is suffixed with "Copy" from the
   * copy-to-clipboard widget — strip everything but digits.
   */
  async getRowIds(): Promise<string[]> {
    return this.gridRows.evaluateAll((rows) =>
      rows
        .map((r) => {
          const idCell = r.querySelector('td:nth-child(3)');
          const text = (idCell?.textContent || '').trim();
          const m = text.match(/\d+/);
          return m ? m[0] : '';
        })
        .filter(Boolean),
    );
  }

  async goToNextPage(): Promise<void> {
    const currentPage = await this.pageInput.inputValue();
    const expectedNext = String(Number(currentPage) + 1);
    await this.nextPageButton.click();
    await expect(this.pageInput).toHaveValue(expectedNext, { timeout: 15000 });
  }
}
