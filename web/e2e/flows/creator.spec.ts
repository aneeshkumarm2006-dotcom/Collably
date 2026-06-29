import { test, expect } from '@playwright/test';
import { ACCOUNTS, login, uniqueEmail } from '../helpers';

/**
 * Creator critical path. Because a freshly-registered creator is "under review"
 * (not yet approved) and has no accepted collabs, the journey is split:
 *  1. Signup → creator onboarding → dashboard (a brand-new account).
 *  2. Explore → apply → submit using the seeded, approved creator (Maya) who has
 *     an accepted collab ready to submit.
 */

test('signup → creator onboarding → dashboard', async ({ page }) => {
  const email = uniqueEmail('creator');

  await page.goto('/signup');
  await page.getByRole('button', { name: /I'm a Creator/ }).click();
  await page.getByLabel('Full name').fill('Test Creator');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await page.waitForURL(/\/onboarding\/creator/);

  // Step 1 — Bio & niche (niche required to advance).
  await expect(page.getByRole('heading', { name: 'Tell brands about you' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Food' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2 — Location (optional).
  await expect(page.getByRole('heading', { name: 'Where are you based?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 3 — Socials (≥1 platform with a handle + valid link required).
  await expect(page.getByRole('heading', { name: 'Where can brands find you?' })).toBeVisible();
  await page.locator('#social-instagram-handle').fill('testcreator');
  await page.locator('#social-instagram-link').fill('https://instagram.com/testcreator');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 4 — Content types (optional).
  await expect(page.getByRole('heading', { name: 'What do you create?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 5 — Portfolio (optional) → finish.
  await expect(page.getByRole('heading', { name: 'Show your best work' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish setup' }).click();

  // Celebration → into the dashboard.
  const cta = page.getByRole('button', { name: 'Explore campaigns' });
  await expect(cta).toBeVisible();
  await cta.click();
  await page.waitForURL(/\/dashboard\/creator/);
});

test('approved creator applies to a campaign', async ({ page }) => {
  await login(page, ACCOUNTS.creator);

  // Find a campaign Maya hasn't applied to yet (Thread & Co's "Sustainable Style Story").
  await page.goto('/dashboard/creator/explore');
  await page.getByLabel('Search campaigns').fill('Sustainable');
  const card = page.getByRole('link').filter({ hasText: 'Sustainable Style Story' }).first();
  await expect(card).toBeVisible();
  await card.click();
  await page.waitForURL(/\/campaign\//);

  // Approved creator → the apply dialog.
  await page.getByRole('button', { name: 'Apply now' }).click();
  await expect(page.getByRole('heading', { name: 'Apply to this campaign' })).toBeVisible();
  await page.getByPlaceholder('Your pitch (optional)…').fill('I create sustainable-fashion reels.');
  await page.getByRole('button', { name: 'Submit application' }).click();

  // The panel flips to the applied state.
  await expect(page.getByRole('button', { name: 'Application submitted' })).toBeVisible();
});

test('accepted creator submits content for a collab', async ({ page }) => {
  await login(page, ACCOUNTS.creator);

  // The "30-Day Fitness Challenge" collab is Accepted and not yet submitted.
  await page.goto('/dashboard/creator/collabs');
  const submitLink = page.getByRole('link', { name: /Submit content/ }).first();
  await expect(submitLink).toBeVisible();
  await submitLink.click();
  await page.waitForURL(/\/dashboard\/creator\/collabs\/.+\/submit/);

  await expect(page.getByRole('heading', { name: 'Submit your content' })).toBeVisible();
  await page.getByLabel('Live post link').fill('https://instagram.com/reel/e2e-test-post');
  // Confirm checkbox unlocks the submit button.
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Submit proof/ }).click();

  await expect(page.getByRole('heading', { name: 'Submission received!' })).toBeVisible();
});
