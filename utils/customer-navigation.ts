import { Page } from '@playwright/test';
import { env } from '../config/env';

async function ensureAdminHome(page: Page) {
  if (!page.url().includes(env.ADMIN_URL)) {
    await page.goto(env.ADMIN_URL);
    // Wait for the admin nav rather than networkidle — long-poll requests
    // keep the admin dashboard non-idle.
    await page.locator('#nav').waitFor({ state: 'visible', timeout: 30000 });
  }
}

/**
 * Navigate to the "Manage Customers" grid by discovering the link in the
 * admin nav. The href is /devadmin/customer/index/key/<rotating>/ with a
 * key segment that rotates per session, so we resolve it at runtime.
 */
export async function gotoCustomerGrid(page: Page): Promise<void> {
  await ensureAdminHome(page);
  const href = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
    const link = links.find(
      (l) =>
        (l.textContent || '').trim().toLowerCase() === 'manage customers' &&
        /\/customer\/index\//i.test(l.href),
    );
    return link ? link.href : null;
  });
  if (!href) throw new Error('"Manage Customers" link not found in admin nav');
  await page.goto(href);
  await page.locator('table thead th').first().waitFor({ state: 'visible', timeout: 30000 });
}
