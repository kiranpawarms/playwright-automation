import { test, expect } from '@playwright/test';
import { env } from '../../config/env';

// Consignment POs live in a separate admin module from regular POs:
//   regular  → /devadmin/Purchase_Orders/...
//   consignment → /devadmin/consignment/...
// The New-PO form on each module is structurally identical (supplier
// select + Save). The "consignment flag" in the QA spec maps to which
// module the user creates the PO under, not a form field.
test.describe('Purchase Order - Consignment', () => {
  test('TC_PO_014: Verify consignment PO creation lands in the consignment module', async ({ page }) => {
    test.setTimeout(120_000);
    let consignmentGridHref = '';
    let consignmentEditUrl = '';

    await test.step('Resolve "Consignment Purchase Order" nav link from admin home', async () => {
      await page.goto(env.ADMIN_URL);
      await page.locator('#nav').waitFor({ state: 'visible', timeout: 20_000 });
      const href = await page.evaluate(() => {
        const link = Array.from(document.querySelectorAll('a')).find(
          (a) => (a.textContent || '').trim() === 'Consignment Purchase Order',
        ) as HTMLAnchorElement | undefined;
        return link?.href || null;
      });
      expect(href, '"Consignment Purchase Order" link should exist in admin nav').toBeTruthy();
      consignmentGridHref = href!;
      console.log(`Consignment grid: ${consignmentGridHref}`);
    });

    await test.step('Open the Consignment Purchase Order grid', async () => {
      await page.goto(consignmentGridHref);
      await page.waitForLoadState('domcontentloaded');
      // Sanity: confirm we landed in the consignment module, not regular PO.
      expect(page.url(), 'Grid URL must contain /consignment/').toMatch(/\/devadmin\/consignment\//);
    });

    await test.step('Click "New" to open the consignment New form', async () => {
      await page.getByRole('button', { name: /^New$/i }).first().click();
      await page.waitForURL(/\/devadmin\/consignment\/new\//, { timeout: 20_000 });
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Validate supplier is selected (Selectize-decorated select)', async () => {
      const supplierSelect = page.locator('select#supplier, select[name="supplier"]').first();
      await supplierSelect.waitFor({ state: 'attached', timeout: 15_000 });
      let selectedValue = await supplierSelect.inputValue();
      if (!selectedValue) {
        const v = await supplierSelect.locator('option').evaluateAll((opts) => {
          const real = (opts as HTMLOptionElement[]).find(
            (o) => o.value && !/select/i.test((o.textContent || '').trim()),
          );
          return real ? real.value : null;
        });
        expect(v, 'Supplier dropdown should have a selectable option').toBeTruthy();
        await supplierSelect.selectOption(v!);
        selectedValue = await supplierSelect.inputValue();
      }
      expect(selectedValue, 'Supplier must have a non-empty value before save').toBeTruthy();
    });

    await test.step('Submit the form and verify the PO was created in the consignment module', async () => {
      await page
        .locator('[id="page:main-container"]')
        .getByRole('button', { name: 'Save' })
        .first()
        .click();
      await page.waitForLoadState('networkidle');

      // Status pill on the edit page — same as regular PO ("Created").
      await expect(
        page.getByRole('cell', { name: 'Created', exact: true }).first(),
        'Newly created consignment PO should show status "Created"',
      ).toBeVisible({ timeout: 20_000 });

      consignmentEditUrl = page.url();
      console.log(`Post-save URL: ${consignmentEditUrl}`);

      // Strongest "is consignment" evidence: the edit URL is in the
      // consignment namespace, not Purchase_Orders.
      expect(
        consignmentEditUrl,
        'Edit URL after Save must be /devadmin/consignment/... — not /Purchase_Orders/',
      ).toMatch(/\/devadmin\/consignment\//);
      expect(
        consignmentEditUrl,
        'Edit URL must NOT be the regular PO module',
      ).not.toMatch(/\/Purchase_Orders\//);
    });

    await test.step('Confirm the new PO is visible on the consignment grid', async () => {
      // Pull the consignment ID from the edit URL (mirrors how regular PO
      // captures po_num — consignment may use po_num too, since the form
      // is structurally identical).
      const m = consignmentEditUrl.match(/(?:po_num|order_id|id)\/(\d+)/);
      const newId = m ? m[1] : '';
      console.log(`New consignment PO id: ${newId || '(not in URL — verifying via grid landing)'}`);

      await page.goto(consignmentGridHref);
      await page.waitForLoadState('domcontentloaded');

      if (newId) {
        const ourLink = page.locator(`a[href*="/consignment/"][href*="/${newId}/"]`).first();
        await expect(
          ourLink,
          `New consignment PO ${newId} should be linked from the consignment grid`,
        ).toBeVisible({ timeout: 20_000 });
      } else {
        // Fallback — at minimum, the grid must have the consignment URL pattern.
        const anyLink = page.locator('a[href*="/devadmin/consignment/"]').first();
        await expect(anyLink).toBeVisible({ timeout: 20_000 });
      }

      await page.screenshot({
        path: `screenshots/po-create/tc14-consignment-po.png`,
        fullPage: true,
      });
    });
  });
});
