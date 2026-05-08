import { Page, Locator, expect } from '@playwright/test';
import { gotoCreateNewOrder, gotoPoGrid } from '../utils/po-navigation';

export class PurchaseOrderPage {
  readonly pageHeader: Locator;
  readonly itemStockHeader: Locator;
  readonly categoryHeads: Locator;
  readonly categoryNames: Locator;
  readonly innerBodies: Locator;
  readonly saveOrderButton: Locator;
  readonly tableHeaders: Locator;

  constructor(private page: Page) {
    this.pageHeader = page.locator('.content-header h3:has-text("Purchase Order Manage")').last();
    this.itemStockHeader = page.locator('h4:has-text("Item Stock Manage")');
    this.categoryHeads = page.locator('.poacc_head');
    this.categoryNames = page.locator('.poacc_head .po_model');
    this.innerBodies = page.locator('.poacc_inner_body');
    this.saveOrderButton = page.locator('button.save[title="Save"]');
    this.tableHeaders = page.locator('table.order-tables th');
  }

  /** Parameterised locator: a top-level category header by its model name. */
  categoryHead(name: string): Locator {
    return this.page.locator(`.poacc_head:has(.po_model:text-is("${name}"))`);
  }

  /** Parameterised locator: a subcategory header by its model name. */
  subcategoryHead(name: string): Locator {
    return this.page.locator(`.poacc_inner_head:has(.po_model:text-is("${name}"))`).first();
  }

  /** Parameterised locator: a product row by SKU. */
  productRow(sku: string): Locator {
    return this.page.locator(`.po_row:has-text("${sku}")`);
  }

  async navigateToCreateNewOrder() {
    await gotoCreateNewOrder(this.page);
  }

  async navigateToGrid() {
    await gotoPoGrid(this.page);
  }

  async verifyPageLoaded() {
    await expect(this.pageHeader).toBeVisible();
    await expect(this.itemStockHeader).toBeVisible();
  }

  async getCategoryNames(): Promise<string[]> {
    return this.categoryNames.allTextContents();
  }

  async expandCategory(name: string) {
    await this.categoryHead(name).click();
    await this.page.waitForTimeout(1000);
  }

  async expandSubcategory(name: string) {
    await this.subcategoryHead(name).locator('.poinnerplmin').click();
    // Wait for AJAX to load products
    await this.page.waitForTimeout(5000);
  }

  async hasProductRows(): Promise<boolean> {
    const count = await this.innerBodies.count();
    for (let i = 0; i < count; i++) {
      const html = await this.innerBodies.nth(i).innerHTML();
      if (html.length > 50) return true;
    }
    return false;
  }

  async fillOrderQuantity(sku: string, quantity: string) {
    await this.productRow(sku).locator('.qty-txt').fill(quantity);
  }

  async saveSubcategoryOrder(name: string) {
    await this.subcategoryHead(name).locator('button.savecatdata').click();
    await this.page.waitForTimeout(2000);
  }

  async saveOrder() {
    await this.saveOrderButton.first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async verifyTableHeaders() {
    await expect(this.tableHeaders.nth(0)).toContainText('Category');
    await expect(this.tableHeaders.nth(1)).toContainText('Item SKU');
    await expect(this.tableHeaders.nth(2)).toContainText('Item');
    await expect(this.tableHeaders.nth(3)).toContainText('Current Inventory');
    await expect(this.tableHeaders.nth(4)).toContainText('Order');
  }
}
