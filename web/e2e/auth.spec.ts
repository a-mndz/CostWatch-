import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=CostWatch')).toBeVisible();
    await expect(page.locator('text=Sign In')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('registers new user', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    await page.goto('/login');

    await page.locator('text=Create Account').click();
    await page.locator('input[placeholder="Your name"]').fill('Test User');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('logs in existing user', async ({ page }) => {
    const email = `login-${Date.now()}@example.com`;
    const password = 'password123';

    // Register via API first
    await page.request.post('/api/auth/register', {
      data: { email, password, name: 'Login Test' },
    });

    // Login via form
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
