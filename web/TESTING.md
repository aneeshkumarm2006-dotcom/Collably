# Testing & QA (Phase 14)

The website has three test layers, all runnable against **mock mode** (the MSW
in-memory backend) so nothing depends on a live backend.

| Layer | Tool | Location | What it covers |
|---|---|---|---|
| Unit | Vitest (node/jsdom) | `tests/unit/*.test.ts` | Pure utils + API mappers (`lib/**`) |
| Component | Vitest + Testing Library | `tests/components/*.test.tsx` | Shared components (`components/shared/**`), states + light/dark |
| E2E | Playwright | `e2e/**/*.spec.ts` | Critical role flows + cross-browser/mobile smoke |

## Commands

```bash
# Unit + component (fast; jsdom, no browser, no server)
npm test                 # all Vitest tests (35 files, 560+ cases)
npm run test:unit        # just tests/unit
npm run test:components  # just tests/components
npm run test:watch       # watch mode

# E2E (Playwright, mock production build on :3100)
npm run test:e2e:install # one-time: download browser binaries
npm run test:e2e         # builds .next-e2e + starts the mock server + runs all projects
```

The first `npm run test:e2e` is self-contained: Playwright's `webServer`
runs `build:e2e` then `start:e2e`. During iteration you can keep a server up
yourself (`npm run start:e2e`) and Playwright reuses it.

Run a subset:

```bash
npx playwright test --project=chromium                 # all critical flows
npx playwright test --project=firefox --project=webkit # cross-browser smoke
npx playwright test e2e/flows/creator.spec.ts          # one flow
```

## How it's wired

- **Vitest** (`vitest.config.ts`, `vitest.setup.ts`): jsdom env, the `@/` and
  `@shared/` aliases mirrored from `tsconfig.json`, and stubs for the Next
  runtime (`next/image` → `<img>`, `next/link` → `<a>`, `next/navigation`) plus
  jsdom polyfills (`matchMedia`, `ResizeObserver`, `IntersectionObserver`,
  pointer-capture) so Radix/next-themes components render. jsdom has no CSS, so
  "dark mode" component tests assert stable structure under a `.dark` wrapper
  rather than computed colors.
- **Playwright** (`playwright.config.ts`): runs against a **production** mock
  build (`NEXT_PUBLIC_USE_MOCKS=true`, isolated `.next-e2e` dist dir) on port
  3100 — the race-free path (the `next dev` + MSW interception race noted in
  earlier phases doesn't affect a production build). The mock dataset is one
  in-memory store shared by the single server process, so tests run **serially**
  (`workers: 1`); each spec logs in fresh and acts on distinct records.
  Mutating flows run on Chromium; a read-only `smoke.spec.ts` also runs on
  Firefox, WebKit, and a Pixel-5 mobile viewport.
- Seeded mock accounts (any password works) live in `e2e/helpers.ts`:
  `maya@collably.app` (approved creator), `hello@mapleandoak.ca` (approved
  business), `hi@peakfitness.ca` (the business sharing a collab thread with Maya).

## Note: tests are excluded from the app build

`tests/`, `e2e/`, and the test configs are excluded in `tsconfig.json`, so
`next build` / `npm run typecheck` ignore them. Vitest type-checks nothing (it
transforms with esbuild); test correctness is enforced by running the suites.
