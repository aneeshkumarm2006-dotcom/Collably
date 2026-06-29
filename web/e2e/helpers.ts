import { expect, type Page } from '@playwright/test';

/**
 * Shared E2E helpers + seeded mock-account references (Phase 14).
 *
 * The mock backend (MSW) accepts ANY password for a seeded email and issues a
 * `mock.<id>` token, so logging in only needs the address. These accounts come
 * from `mocks/db.ts` (the recovered seed world).
 */
export const ACCOUNTS = {
  /** Maya Bennett — onboarded + approved creator (cp-me) with applications + collabs. */
  creator: 'maya@collably.app',
  /** Maple & Oak — onboarded + approved business (bp-me) with campaigns + applicants. */
  business: 'hello@mapleandoak.ca',
  /** Peak Fitness Studio — the business sharing the "30-Day Fitness Challenge" collab thread with Maya. */
  peakFitness: 'hi@peakfitness.ca',
} as const;

/** The mock ignores the password for a seeded email; any non-empty value works. */
export const PASSWORD = 'password123';

/** A run-unique email so the signup flows never collide with a prior run's user. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Log in a seeded account and wait until the role dashboard has loaded. */
export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/dashboard\/(creator|business)/, { timeout: 30_000 });
}

/** Open the avatar menu (navbar or dashboard topbar) and log out, waiting until
 * the session cookies have actually been cleared server-side. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/logout')),
    page.getByRole('menuitem', { name: 'Log out' }).click(),
  ]);
}

/** Click the explore campaign card whose title matches, opening its detail page. */
export async function openCampaignByTitle(page: Page, title: string | RegExp): Promise<void> {
  const card = page.getByRole('link').filter({ hasText: title }).first();
  await expect(card).toBeVisible();
  await card.click();
  await page.waitForURL(/\/campaign\//);
}
