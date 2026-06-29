import { test, expect } from '@playwright/test';

/**
 * Cross-browser + mobile-viewport smoke pass (Phase 14). READ-ONLY — it never
 * mutates the shared mock state, so it runs safely on Chromium, Firefox, WebKit,
 * and a mobile viewport (see `playwright.config.ts` projects).
 */

test('landing page renders the marketing hero', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Collably/i);
  // The brand wordmark links home from the navbar on every breakpoint.
  await expect(page.getByRole('link', { name: 'Collably home' }).first()).toBeVisible();
  // A primary CTA into the product.
  await expect(page.getByRole('link', { name: /Get started|Explore/i }).first()).toBeVisible();
});

test('explore lists seeded campaigns', async ({ page }) => {
  await page.goto('/explore');
  await expect(page.getByRole('heading', { name: 'Explore campaigns' })).toBeVisible();
  // Seed data should surface at least one known campaign card.
  await expect(
    page.getByRole('link').filter({ hasText: /Tasting Menu|Skincare Set Review|Fitness Challenge/ }).first(),
  ).toBeVisible();
});

test('a campaign detail page renders with an apply CTA', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('link').filter({ hasText: 'Skincare Set Review' }).first().click();
  await page.waitForURL(/\/campaign\//);
  // As a guest, the apply CTA invites signup (it's a Link styled as a button, so role=link).
  await expect(page.getByRole('link', { name: 'Sign up to apply' })).toBeVisible();
});

test('auth pages render', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();

  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Join Collably' })).toBeVisible();
  await expect(page.getByRole('button', { name: /I'm a Creator/ })).toBeVisible();
});

test('pricing + a legal page render', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
