import { Page, Locator } from '@playwright/test';
import { gotoCustomerGrid } from '../utils/customer-navigation';

export class CustomerPage {
  /**
   * The grid's <thead> contains two rows: row 1 = column headers, row 2 = per-column
   * filter inputs/dropdowns. We only want the labels from the first row.
   */
  readonly headerCells: Locator;
  readonly gridRows: Locator;

  constructor(private page: Page) {
    this.headerCells = page.locator('table thead tr').first().locator('th');
    this.gridRows = page.locator('table tbody tr');
  }

  async navigateToGrid(): Promise<void> {
    await gotoCustomerGrid(this.page);
  }

  async getColumnHeaders(): Promise<string[]> {
    return this.headerCells.evaluateAll((ths) =>
      ths.map((th) => (th.textContent || '').trim()).filter(Boolean),
    );
  }
}
