import { test, expect } from '@playwright/test';
import { env } from '../../config/env';

// Login tests must start unauthenticated — override the global storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Admin Login - Authentication Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(env.ADMIN_URL);
    await page.waitForLoadState('networkidle');
  });

  // ========== VALID CREDENTIALS ==========

  test('TC-01: Login with valid username and valid password', async ({ page }) => {
    await page.fill('#username', env.ADMIN_USER);
    await page.fill('#login', env.ADMIN_PASS);
    await page.click('button[title="Login"]');
    await page.waitForLoadState('networkidle');

    // Should redirect to dashboard - nav menu visible
    await expect(page.locator('#nav')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'screenshots/login/tc01-valid-login.png' });
  });

  // ========== INVALID CREDENTIALS ==========

  test('TC-02: Login with valid username and invalid password', async ({ page }) => {
    await page.fill('#username', env.ADMIN_USER);
    await page.fill('#login', 'wrongpassword123');
    await page.click('button[title="Login"]');
    await page.waitForLoadState('networkidle');

    // Should show error message
    await expect(page.locator('#messages').getByText('Invalid User Name or Password')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/login/tc02-invalid-password.png' });
  });

  test('TC-03: Login with invalid username and valid password', async ({ page }) => {
    await page.fill('#username', 'invaliduser');
    await page.fill('#login', env.ADMIN_PASS);
    await page.click('button[title="Login"]');
    await page.waitForLoadState('networkidle');

    // Should show error message
    await expect(page.locator('#messages').getByText('Invalid User Name or Password')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/login/tc03-invalid-username.png' });
  });

  test('TC-04: Login with invalid username and invalid password', async ({ page }) => {
    await page.fill('#username', 'fakeuser');
    await page.fill('#login', 'fakepass123');
    await page.click('button[title="Login"]');
    await page.waitForLoadState('networkidle');

    // Should show error message
    await expect(page.locator('#messages').getByText('Invalid User Name or Password')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/login/tc04-invalid-both.png' });
  });

  // ========== EMPTY FIELDS ==========

  test('TC-05: Login with empty username and empty password', async ({ page }) => {
    // Click login without filling any fields
    await page.click('button[title="Login"]');
    await page.waitForLoadState('networkidle');

    // Should remain on login page - login button still visible
    await expect(page.locator('button[title="Login"]')).toBeVisible();

    // Should not navigate to dashboard
    await expect(page.locator('#nav')).not.toBeVisible();
    await page.screenshot({ path: 'screenshots/login/tc05-empty-fields.png' });
  });

  test('TC-06: Login with valid username and empty password', async ({ page }) => {
    await page.fill('#username', env.ADMIN_USER);
    // Leave password empty
    await page.click('button[title="Login"]');
    await page.waitForLoadState('networkidle');

    // Should remain on login page
    await expect(page.locator('button[title="Login"]')).toBeVisible();
    await expect(page.locator('#nav')).not.toBeVisible();
    await page.screenshot({ path: 'screenshots/login/tc06-empty-password.png' });
  });

  test('TC-07: Login with empty username and valid password', async ({ page }) => {
    await page.fill('#login', env.ADMIN_PASS);
    // Leave username empty
    await page.click('button[title="Login"]');
    await page.waitForLoadState('networkidle');

    // Should remain on login page
    await expect(page.locator('button[title="Login"]')).toBeVisible();
    await expect(page.locator('#nav')).not.toBeVisible();
    await page.screenshot({ path: 'screenshots/login/tc07-empty-username.png' });
  });

  // ========== UI VERIFICATION ==========

  test('TC-08: Verify login page UI elements are displayed', async ({ page }) => {
    // Welcome heading
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();

    // Username field
    await expect(page.locator('#username')).toBeVisible();

    // Password field
    await expect(page.locator('#login')).toBeVisible();

    // Login button
    await expect(page.locator('button[title="Login"]')).toBeVisible();

    // Forgot password link
    await expect(page.getByRole('link', { name: 'Forgot your password?' })).toBeVisible();

    await page.screenshot({ path: 'screenshots/login/tc08-ui-elements.png' });
  });

  test('TC-09: Verify password field is masked', async ({ page }) => {
    await page.fill('#login', 'testpassword');

    const inputType = await page.locator('#login').getAttribute('type');
    expect(inputType).toBe('password');
    await page.screenshot({ path: 'screenshots/login/tc09-password-masked.png' });
  });

  test('TC-10: Verify login page title', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    console.log(`Page title: ${title}`);
    await page.screenshot({ path: 'screenshots/login/tc10-page-title.png' });
  });
});
