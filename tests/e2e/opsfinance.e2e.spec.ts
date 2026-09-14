import { test, expect } from '@playwright/test';

const E2E_ENVIRONMENT = 'E2E TEST ENVIRONMENT';

test.describe(E2E_ENVIRONMENT, () => {
  test('auth protected route placeholder and landing route render', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'OpsFinance' })).toBeVisible();
    await page.getByRole('link', { name: 'Login' }).click();
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await page.goto('/transactions');
    await expect(page.getByText('All Transactions')).toBeVisible();
  });

  test('business access and settings navigation are available in the mock environment', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await page.getByRole('link', { name: 'Subscription', exact: true }).click();
    await expect(page.getByRole('heading', { name: /OpsFinance current plan/i })).toBeVisible();
  });

  test('money in, money out, transfer, upload, reconciliation, and reports screens load', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByText('All Transactions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Money In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Money Out', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Transfer', exact: true })).toBeVisible();

    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: 'Upload & Convert' })).toBeVisible();
    await expect(page.getByText('Parse & review')).toBeVisible();

    await page.goto('/reconciliation');
    await expect(page.getByRole('heading', { name: 'Bank Reconciliation' })).toBeVisible();

    await page.goto('/reports');
    await expect(page.getByText('General Ledger')).toBeVisible();
  });
});
