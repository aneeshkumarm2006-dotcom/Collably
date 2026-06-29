import { test, expect } from '@playwright/test';
import { ACCOUNTS, login } from '../helpers';

/**
 * Messaging round-trip across two participants sharing one collab thread (the
 * "30-Day Fitness Challenge": Maya ↔ Peak Fitness Studio). The creator sends a
 * message; the business — in a separate browser context against the same shared
 * mock store — opens the thread and sees it.
 */

test('creator sends a message and the business receives it', async ({ browser }) => {
  const message = `E2E round-trip ${Date.now()}`;

  // --- Creator sends ---
  const creatorCtx = await browser.newContext();
  const creator = await creatorCtx.newPage();
  await login(creator, ACCOUNTS.creator);
  await creator.goto('/dashboard/creator/messages');

  await creator.getByRole('link').filter({ hasText: 'Peak Fitness' }).first().click();
  await creator.waitForURL(/\/dashboard\/creator\/messages\/.+/);

  const creatorInput = creator.getByRole('textbox', { name: 'Message' });
  await expect(creatorInput).toBeVisible();
  await creatorInput.fill(message);
  await creator.getByRole('button', { name: 'Send message' }).click();

  // Optimistic bubble shows immediately and persists after the server round-trip.
  await expect(creator.getByText(message)).toBeVisible();
  await creator.reload();
  await expect(creator.getByText(message)).toBeVisible();

  // --- Business receives (separate session, shared mock state) ---
  const bizCtx = await browser.newContext();
  const business = await bizCtx.newPage();
  await login(business, ACCOUNTS.peakFitness);
  await business.goto('/dashboard/business/messages');

  await business.getByRole('link').filter({ hasText: 'Maya' }).first().click();
  await business.waitForURL(/\/dashboard\/business\/messages\/.+/);
  await expect(business.getByText(message)).toBeVisible();

  await creatorCtx.close();
  await bizCtx.close();
});
