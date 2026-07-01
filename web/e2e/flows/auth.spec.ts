import { test, expect } from '@playwright/test';
import { ACCOUNTS, login, logout, openCampaignByTitle } from '../helpers';

/**
 * Auth: login → session persists across reload (the cookie + `/api/auth/me`
 * re-hydration path) → logout → guarded routes bounce to /login. Plus the
 * guest-browse → gated-apply path.
 */

test('login, session persists across reload, then logout clears the guard', async ({ page }) => {
  await login(page, ACCOUNTS.creator);
  await expect(page).toHaveURL(/\/dashboard\/creator/);

  // Session survives a hard reload (re-hydrated from the httpOnly cookie).
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard\/creator/);

  // Log out from the public navbar's account menu.
  await page.goto('/');
  await logout(page);
  // The navbar reverts to the signed-out CTA.
  await expect(page.getByRole('link', { name: 'Get started' }).first()).toBeVisible();

  // A guarded route now redirects to login.
  await page.goto('/dashboard/creator');
  await expect(page).toHaveURL(/\/login/);
});

test('guest browsing a campaign hits the gated "Sign up to apply" CTA', async ({ page }) => {
  await page.goto('/explore');
  // A campaign owned by a business untouched by the mutating flows (Bloom Beauty).
  await openCampaignByTitle(page, 'Skincare Set Review');

  const cta = page.getByRole('link', { name: 'Sign up to apply' });
  await expect(cta).toBeVisible();
  await cta.click();
  // It routes to login with a `next` back to the campaign.
  await expect(page).toHaveURL(/\/login\?next=%2Fcampaign%2F|\/login\?next=\/campaign\//);
});
