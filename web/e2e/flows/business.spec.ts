import { test, expect } from '@playwright/test';
import { ACCOUNTS, login, uniqueEmail } from '../helpers';

/**
 * Business critical path. A freshly-registered business is unverified (can only
 * save drafts), so the journey is split:
 *  1. Signup → business onboarding → dashboard (a brand-new account).
 *  2. Create + publish a campaign, accept an application, and verify a submission
 *     using the seeded, approved business (Maple & Oak) with live applicants.
 */

test('signup → business onboarding → dashboard', async ({ page }) => {
  const email = uniqueEmail('biz');

  await page.goto('/signup');
  await page.getByRole('button', { name: /I'm a Business/ }).click();
  await page.getByLabel('Business name').fill('Acme Studio');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await page.waitForURL(/\/onboarding\/business/);

  // Step 1: Basics (name pre-filled from signup; category required to advance).
  await expect(page.getByRole('heading', { name: 'Tell us about your business' })).toBeVisible();
  await page.getByRole('radio', { name: 'Restaurant' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2: Location (optional).
  await page.getByRole('button', { name: 'Continue' }).click();
  // Step 3: Socials (optional).
  await page.getByRole('button', { name: 'Continue' }).click();
  // Step 4: Logo (optional) → finish.
  await page.getByRole('button', { name: 'Finish setup' }).click();

  const cta = page.getByRole('button', { name: 'Go to dashboard' });
  await expect(cta).toBeVisible();
  await cta.click();
  await page.waitForURL(/\/dashboard\/business/);
});

test('approved business creates and publishes a campaign', async ({ page }) => {
  await login(page, ACCOUNTS.business);
  await page.goto('/dashboard/business/campaigns/new');

  await page.getByLabel('Campaign title').fill('E2E Spring Tasting Collab');
  await page.getByLabel('Description', { exact: true }).fill('An end-to-end test campaign verifying the create + publish path.');
  await page.getByRole('radio', { name: 'Restaurant' }).click();
  await page.getByLabel('Reward description').fill('Tasting menu for two');
  // Reward type defaults to Product and one default deliverable is valid.

  await page.getByRole('button', { name: 'Publish campaign' }).click();

  await page.waitForURL(/\/dashboard\/business\/campaigns$/);
  await expect(page.getByText('E2E Spring Tasting Collab')).toBeVisible();
});

test('business accepts a pending application', async ({ page }) => {
  await login(page, ACCOUNTS.business);
  await page.goto('/dashboard/business/applications');

  // Exact match so we don't catch the "Accepted" tab button.
  const acceptButtons = page.getByRole('button', { name: 'Accept', exact: true });
  await expect(acceptButtons.first()).toBeVisible();
  const before = await acceptButtons.count();
  await acceptButtons.first().click();

  // The accepted applicant loses its Accept action → one fewer pending decision.
  await expect(acceptButtons).toHaveCount(before - 1);
});

test('business verifies a submission', async ({ page }) => {
  await login(page, ACCOUNTS.business);
  await page.goto('/dashboard/business/submissions');

  const verifyBtn = page.getByRole('button', { name: 'Mark verified' }).first();
  await expect(verifyBtn).toBeVisible();
  await verifyBtn.click();

  await expect(page.getByText(/Submission verified/)).toBeVisible();
});
