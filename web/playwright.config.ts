import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config — Phase 14. Drives the website against MOCK MODE (the MSW
 * in-memory backend), so the critical role flows run with no real backend.
 *
 * The mock dataset is a single in-memory store inside ONE Next server process, so
 * mutating flows (apply / accept / submit / verify / send message) share state.
 * We therefore run serially (`workers: 1`, `fullyParallel: false`) for
 * determinism; each spec logs in fresh and acts on distinct records.
 *
 * Server: a production mock build (`build:e2e`) served by `start:e2e` on :3100 —
 * the race-free path (the `next dev` + MSW interception race noted in earlier
 * phases does not affect a production build). `reuseExistingServer` lets a
 * manually-started `start:e2e` be reused during iteration.
 *
 * Projects: the full flows run on Chromium; a read-only `smoke.spec.ts` also runs
 * on Firefox, WebKit, and a mobile viewport (the cross-browser + mobile pass).
 */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // Full critical-flow suite (+ the smoke spec) on desktop Chromium.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Cross-browser + mobile-viewport smoke pass — read-only, so no state races.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /smoke\.spec\.ts/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: /smoke\.spec\.ts/ },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] }, testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: {
    // Build (idempotent) + start the mock production server. If a server is
    // already up on :3100 (e.g. `npm run start:e2e` during iteration), it's reused
    // and this command is skipped.
    command: 'npm run build:e2e && npm run start:e2e',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
