import { chromium, FullConfig } from '@playwright/test';
import { AdminLoginPage } from './pages/admin-login.page';
import { env } from './config/env';

/**
 * Runs once before the test suite.
 * Logs into the admin panel and saves the authenticated session to auth.json.
 * All specs then reuse it via `storageState: 'auth.json'` in playwright.config.ts,
 * avoiding per-test login cost.
 */
export default async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const loginPage = new AdminLoginPage(page);
  await loginPage.login();

  await context.storageState({ path: 'auth.json' });
  await browser.close();

  console.log(`[global-setup] auth.json saved for ${env.ADMIN_URL}`);
}
