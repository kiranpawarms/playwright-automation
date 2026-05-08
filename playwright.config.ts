import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 1,
  globalSetup: require.resolve('./global-setup'),
  reporter: [
    ['html'],
    ['allure-playwright'],
  ],
  use: {
    baseURL: process.env.ADMIN_URL || 'https://dev.mobilesentrix.com/devadmin',
    storageState: 'auth.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    headless: false,
    viewport: null,
    launchOptions: {
      args: ['--start-maximized'],
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
