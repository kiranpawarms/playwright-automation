import { test, expect } from '@playwright/test';

test.use({
  storageState: 'auth.json',
  viewport: {
    height: 1080,
    width: 1920
  }
});

test('test', async ({ page }) => {
  await page.goto('https://dev.mobilesentrix.com/devadmin/dashboard/index/key/3d99343ca2294f70a4de61bd18540d12/');
  await page.getByRole('link', { name: 'ERP' }).click();
  await page.getByRole('link', { name: 'ERP' }).click();
  await page.getByRole('link', { name: 'Purchase orders' }).click();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByText('026-Shanwei Hengweiye').nth(1).click();
  await page.getByText('-SIIX Technology Co., LTD.').click();
  await page.locator('[id="page:main-container"]').getByRole('button', { name: 'Save' }).click();
  await page.getByRole('cell', { name: 'Created' }).click();
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Add Products', exact: true }).click();
  await page.locator('#ProductSelection_filter_stock_summary_from').click();
  await page.locator('#ProductSelection_filter_stock_summary_from').fill('10');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('row', { name: 'OLED_Assembly_For_iPhone_15_Pro__(Genuine_OEM)' }).getByRole('checkbox').check();
  await page.getByRole('row', { name: 'OLED_Assembly_For_iPhone_15_Pro__(Genuine_OEM)' }).getByRole('checkbox').click();
  await page.getByRole('row', { name: 'OLED_Assembly_For_iPhone_15_Pro__(Genuine_OEM)' }).getByRole('checkbox').press('4');
  await page.getByRole('cell').nth(4).click();
  await page.getByRole('row', { name: 'OLED_Assembly_For_iPhone_15_Pro__(Genuine_OEM)' }).locator('input[name="qty"]').click();
  await page.getByRole('row', { name: 'OLED_Assembly_For_iPhone_15_Pro__(Genuine_OEM)' }).locator('input[name="qty"]').fill('4');
  await page.locator('.pointer.on-mouse > td > .checkbox').check();
  await page.getByRole('row', { name: 'Replacement Battery Compatible For iPad 3 / iPad 4 (Premium) 107082005130' }).locator('input[name="qty"]').click();
  await page.getByRole('row', { name: 'Replacement Battery Compatible For iPad 3 / iPad 4 (Premium) 107082005130' }).locator('input[name="qty"]').fill('3');
  await page.locator('#content').getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Summary', exact: true }).click();
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Receive' }).click();
  await page.goto('https://dev.mobilesentrix.com/devadmin/Purchase_Orders/Edit/po_num/898785/key/affc02c578d0b1d7c3952b68c61b2417/');
  await page.getByRole('cell', { name: 'Received', exact: true }).click();
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Deliveries / Verify', exact: true }).click();
  await page.getByRole('checkbox', { name: 'VERIFY BOX QTY(S)' }).check();
  await page.goto('https://dev.mobilesentrix.com/devadmin/Purchase_Orders/Edit/tab/tab_deliveries/delaction/verify/po_num/898785/key/affc02c578d0b1d7c3952b68c61b2417/');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'All products verified' }).click();
  await page.getByRole('button', { name: 'Add' }).first().click();
  await page.getByText('OVERSTOCK ROOM 103 (OVERSTOCK').click();
  await page.getByRole('button', { name: 'Add' }).click();
  await page.locator('tr:nth-child(2) > td:nth-child(14) > div > div > .poitemlocation').click();
  await page.getByText('-B3 (165-B3)').click();
  await page.getByRole('row', { name: 'CARTEXTRA19' }).getByRole('spinbutton').click();
  await page.getByRole('row', { name: 'CARTEXTRA19' }).getByRole('spinbutton').fill('4');
  await page.getByRole('cell', { name: '-B3  Save Cancel' }).getByRole('spinbutton').click();
  await page.getByRole('cell', { name: '-B3  Save Cancel' }).getByRole('spinbutton').fill('3');
  await page.getByRole('link', { name: 'Save' }).first().click();
  await page.getByRole('cell', { name: '-B3  Save Cancel' }).getByRole('spinbutton').click();
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.locator('#content').getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Summary', exact: true }).click();
  await page.goto('https://dev.mobilesentrix.com/devadmin/Purchase_Orders/Edit/tab/tab_deliveries/delaction/verify/po_num/898785/key/affc02c578d0b1d7c3952b68c61b2417/');
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Summary', exact: true }).click();
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Deliveries / Verify', exact: true }).click();
  await page.getByRole('button', { name: 'Add' }).click();
  await page.locator('.poitemlocation').click();
  await page.getByText('-B3 (165-B3)').click();
  await page.getByRole('spinbutton').click();
  await page.getByRole('spinbutton').fill('3');
  await page.getByRole('link', { name: 'Save' }).click();
  await page.locator('#content').getByRole('button', { name: 'Save' }).click();
  await page.getByText('Summary Products Add Products').click();
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Summary', exact: true }).click();
  await page.goto('https://dev.mobilesentrix.com/devadmin/Purchase_Orders/Edit/po_num/898785/tab/tab_deliveries/key/affc02c578d0b1d7c3952b68c61b2417/');
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Summary', exact: true }).click();
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Deliveries / Verify', exact: true }).click();
  await page.getByRole('checkbox', { name: 'VERIFY BOX QTY(S)' }).check();
  await page.goto('https://dev.mobilesentrix.com/devadmin/Purchase_Orders/Edit/tab/tab_deliveries/delaction/verify/po_num/898785/key/affc02c578d0b1d7c3952b68c61b2417/');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'All products verified' }).click();
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.locator('#content').getByRole('button', { name: 'Save' }).click();
  await page.goto('https://dev.mobilesentrix.com/devadmin/Purchase_Orders/Edit/po_num/898785/tab/tab_deliveries/key/affc02c578d0b1d7c3952b68c61b2417/');
  await page.getByRole('link', { name: 'The information in this tab has been changed. This tab contains invalid data. Please solve the problem before saving. Summary', exact: true }).click();
});