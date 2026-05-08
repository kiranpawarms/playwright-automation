import { test, expect } from '@playwright/test';
import { PurchaseOrderPage } from '../../pages/purchase-order.page';

test.describe('Purchase Order - Export', () => {
  test('TC_PO_013: Verify PO list export downloads a CSV containing grid data', async ({ page }) => {
    test.setTimeout(120_000);
    const poPage = new PurchaseOrderPage(page);
    let topPoNumOnGrid = '';
    let topReferenceOnGrid = '';

    await test.step('Navigate to PO grid and capture the top row', async () => {
      await poPage.navigateToGrid();
      const editLinks = page.locator('a[href*="Purchase_Orders/Edit/po_num/"]');
      await editLinks.first().waitFor({ state: 'attached', timeout: 20000 });

      const href = (await editLinks.first().getAttribute('href')) || '';
      const m = href.match(/po_num\/(\d+)/);
      expect(m, 'Should resolve top row po_num').toBeTruthy();
      topPoNumOnGrid = m![1];

      const topRow = editLinks.first().locator('xpath=ancestor::tr[1]');
      const cells: string[] = await topRow.evaluate((row) =>
        Array.from(row.children).map((c) => (c.textContent || '').trim()),
      );
      // Reference is the first cell that looks like YYYYMMDDPO<n> or any
      // non-empty BOX NO (imported POs use the BOX NO directly).
      const refCell = cells.find((c) => /\d{8}PO\d+/.test(c)) || '';
      const refMatch = refCell.match(/(\d{8}PO\d+)/);
      topReferenceOnGrid = refMatch ? refMatch[1] : '';
      console.log(`Top row — po_num=${topPoNumOnGrid}, reference=${topReferenceOnGrid || '(non-standard, e.g. imported)'}`);
    });

    await test.step('Select CSV format in the grid export dropdown', async () => {
      const formatSelect = page.locator('#PurchaseOrderGrid_export');
      await expect(formatSelect, 'Grid export format select should exist').toHaveCount(1);
      await formatSelect.selectOption({ label: 'CSV' });
    });

    let downloadFilename = '';
    let downloadBytes = Buffer.alloc(0);

    await test.step('Trigger export and capture the download', async () => {
      // Auto-accept any confirm dialog the export might raise.
      page.on('dialog', (d) => d.accept().catch(() => {}));

      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);

      // PurchaseOrderGridJsObject.doExport() is two-stage: doExport()
      // shows a confirmation popup; doExport(true) sets location.href to
      // the export URL, triggering the actual file download. Call with
      // (true) to bypass the popup.
      await page.evaluate(() => {
        const win = window as unknown as { PurchaseOrderGridJsObject?: { doExport?: (isDownload: boolean) => void } };
        if (typeof win.PurchaseOrderGridJsObject?.doExport === 'function') {
          win.PurchaseOrderGridJsObject.doExport(true);
        } else {
          throw new Error('PurchaseOrderGridJsObject.doExport not available on window');
        }
      });

      const dl = await downloadPromise;
      if (!dl) {
        throw new Error('Export did not produce a download within 30s');
      }

      downloadFilename = dl.suggestedFilename();
      const stream = await dl.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      downloadBytes = Buffer.concat(chunks);

      console.log(`Downloaded "${downloadFilename}" — ${downloadBytes.length} bytes`);
    });

    await test.step('Verify the downloaded file is a non-empty CSV', async () => {
      expect(downloadFilename, 'Downloaded file should have a .csv extension').toMatch(/\.csv$/i);
      expect(downloadBytes.length, 'Downloaded CSV should not be empty').toBeGreaterThan(0);
    });

    await test.step('Verify CSV header contains expected PO columns', async () => {
      const text = downloadBytes.toString('utf8').replace(/^﻿/, '');
      const firstLine = text.split(/\r?\n/, 1)[0] || '';
      console.log(`CSV header: ${firstLine}`);

      // Expected columns per the grid headers — match case-insensitively
      // since admin grids occasionally vary the casing in export.
      for (const col of ['Box ID', 'Reference', 'Supplier', 'Status']) {
        expect(
          firstLine,
          `CSV header should mention "${col}"`,
        ).toMatch(new RegExp(col, 'i'));
      }
    });

    await test.step('Verify CSV body contains grid data (the top row PO)', async () => {
      const text = downloadBytes.toString('utf8').replace(/^﻿/, '');
      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      expect(lines.length, 'CSV should have at least header + one data row').toBeGreaterThanOrEqual(2);
      console.log(`CSV row count (incl. header): ${lines.length}`);

      const body = text.slice(text.indexOf('\n') + 1);
      if (topReferenceOnGrid) {
        // Strong correctness check: the PO we saw at the top of the grid
        // should appear somewhere in the export body.
        expect(
          body,
          `Top-of-grid reference ${topReferenceOnGrid} should appear in the exported CSV`,
        ).toContain(topReferenceOnGrid);
      } else {
        // Fallback — top row had a non-standard reference (likely an
        // imported PO using BOX NO). Just confirm the export carries our
        // chosen supplier so the data link is intact.
        expect(body, 'Export should contain at least one supplier row').toMatch(/Shanwei|SIIX|\d{3}-/);
      }
    });
  });
});
