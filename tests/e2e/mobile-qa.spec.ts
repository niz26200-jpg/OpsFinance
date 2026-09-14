import { test, expect } from '@playwright/test';

const E2E_ENVIRONMENT = 'E2E TEST ENVIRONMENT';

test.describe(E2E_ENVIRONMENT, () => {
  test('mobile viewport renders critical flows without crashing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'OpsFinance' })).toBeVisible();
    await page.goto('/transactions');
    await expect(page.getByText('All Transactions')).toBeVisible();
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: 'Upload & Convert' })).toBeVisible();
    await page.goto('/settings/subscription');
    await expect(page.getByRole('heading', { name: /OpsFinance current plan/i })).toBeVisible();
  });
});
