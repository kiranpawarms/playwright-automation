import { Page, Locator } from '@playwright/test';
import { env } from '../config/env';

export class AdminLoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly adminNav: Locator;

  constructor(private page: Page) {
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#login');
    this.loginButton = page.locator('button[title="Login"]');
    this.adminNav = page.locator('#nav');
  }

  async goto() {
    await this.page.goto(env.ADMIN_URL);
  }

  async login(username: string = env.ADMIN_USER, password: string = env.ADMIN_PASS) {
    await this.goto();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // The admin dashboard has long-polling requests, so `networkidle` is unreliable
    // in headless mode. Wait for the post-login nav menu instead.
    await this.adminNav.waitFor({ state: 'visible', timeout: 30000 });
  }
}
