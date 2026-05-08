import { Page } from '@playwright/test';
import { env } from '../config/env';

async function ensureAdminHome(page: Page) {
  if (!page.url().includes(env.ADMIN_URL)) {
    await page.goto(env.ADMIN_URL);
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Navigate to the Purchase Orders grid (list view) by discovering the
 * "Purchase orders" link in the admin nav. The href is capital-case
 * (/Purchase_Orders/List/...) and the key segment rotates per session,
 * so we resolve it at runtime rather than hardcoding.
 */
export async function gotoPoGrid(page: Page): Promise<void> {
  await ensureAdminHome(page);
  const href = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
    const link = links.find(
      (l) =>
        (l.textContent || '').trim().toLowerCase() === 'purchase orders' &&
        /purchase[_]?orders?\//i.test(l.href),
    );
    return link ? link.href : null;
  });
  if (!href) throw new Error('"Purchase orders" link not found in admin nav');
  await page.goto(href);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to the "Create New Order" page via the admin nav.
 */
export async function gotoCreateNewOrder(page: Page): Promise<void> {
  await ensureAdminHome(page);
  const href = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
    const link = links.find(
      (l) =>
        (l.textContent || '').trim() === 'Create New Order' &&
        l.href.includes('purchaseorder'),
    );
    return link ? link.href : null;
  });
  if (!href) throw new Error('"Create New Order" link not found in admin nav');
  await page.goto(href);
  await page.waitForLoadState('networkidle');
}
