# Collably Website (`@collably/web`)

One **Next.js 15 (App Router)** app that serves **both** the marketing site **and** the full
web version of the Collably app (creator + business), over the **same backend** (`../backend`)
and the **same domain layer** (`../shared`) as the Expo app (`../mobile`).

> Admin moderation stays in `../admin`. This app is **Public + Creator + Business** only.
> The full phase-by-phase plan lives in [`../../_ai_context/TODO.md`](../../_ai_context/TODO.md).

## Stack

Next.js 15 · React 19 · TypeScript ~5.7 · Tailwind CSS 3.4 · shadcn/ui · Lucide ·
TanStack Query · socket.io-client · Zod · date-fns · Google Maps JS (Phase 11).

Versions are pinned to match the sibling apps (`../admin`). This app was scaffolded to
mirror `../admin`'s proven Next 15 + Tailwind 3.4 setup rather than from a raw
`create-next-app@latest` (whose current default is Tailwind v4) so the monorepo stays on
one toolchain.

## Getting started

```bash
cd app/web
npm install
cp .env.example .env.local   # already created during scaffold; fill in keys as needed
npm run dev                  # http://localhost:3001
```

Ports in the monorepo: backend `4000`, admin `3000`, **web `3001`**.

### Scripts

| Script                            | What it does                     |
| --------------------------------- | -------------------------------- |
| `npm run dev`                     | Dev server on port 3001          |
| `npm run build` / `npm run start` | Production build / serve         |
| `npm run lint`                    | `next lint` (eslint-config-next) |
| `npm run typecheck`               | `tsc --noEmit`                   |

Repo-wide `npm run format` / `npm run lint` (from `app/`) also cover this app.

## Environment

Copy `.env.example` → `.env.local`. `NEXT_PUBLIC_*` vars reach the browser; everything else
is server-only (route handlers / Server Components).

| Var                                  | Scope  | Purpose                                    |
| ------------------------------------ | ------ | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL`                | public | Backend REST base incl. `/api` (browser)   |
| `NEXT_PUBLIC_SOCKET_URL`             | public | Socket.io origin (backend base, no `/api`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`    | public | Maps JS for Explore (Phase 11)             |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`  | public | Cloudinary media URLs (Phase 11)           |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | public | Google OAuth **Web** client id (Phase 3)   |
| `NEXT_PUBLIC_USE_MOCKS`              | public | `true` → MSW in-memory data (Phase 2)      |
| `SESSION_COOKIE_SECRET`              | server | Signs/encrypts session cookies (Phase 3)   |
| `BACKEND_INTERNAL_URL`               | server | Backend base as seen from the Next server  |

## Data layer (Phase 2)

A typed, swappable access layer used by both the server and the browser. Endpoints are
defined **once** as resource modules (`lib/api/resources/*`) and bound to a transport:

- **Server**: `import { serverApi } from '@/lib/api/server'`. Use in Server Components and
  route handlers. Reads the httpOnly access cookie → `Authorization: Bearer`, talks straight
  to `BACKEND_INTERNAL_URL`, `cache: 'no-store'`.
- **Client**: `import { clientApi } from '@/lib/api/client'`. Use in client components /
  hooks. Calls the **same-origin proxy** `app/api/backend/[...path]`, which forwards to the
  backend with the cookie attached server-side, so the JWT never reaches client JS.
- **Hooks**: `lib/api/queries/*` (TanStack Query). Keys live in `lib/api/query-keys.ts`;
  shared defaults + the request-scoped server client in `lib/api/query-client.ts`. SSR lists
  prefetch via `prefetchQueries` (`lib/api/queries/prefetch.ts`) → `<HydrationBoundary>`.
- **Errors**: every transport throws a normalized `ApiError { status, message, data }`
  (`lib/api/errors.ts`), extracting the backend's first zod issue (ported from mobile).
- **Constants**: `lib/constants.ts` re-exports the shared enums and adds web-only domain
  constants (follower buckets, sort options, status tabs) mirroring the backend.
- **Locations**: `lib/locations.ts` (Canada-first autocomplete, ported from mobile).

> Auth is special: don't call `clientApi.auth.*` from the browser (it would return the JWT
> to JS). Phase 3 adds `/api/auth/*` cookie-setting handlers that call `serverApi.auth.*`.

## Mock mode

Set `NEXT_PUBLIC_USE_MOCKS=true` to run the UI against the in-memory **MSW** dataset instead
of the real backend, mirroring the mobile app's `USE_MOCKS`. Convenience script: `npm run
dev:mock`.

- The seed (`mocks/db.ts`) is the rich "CollabSpace" demo world recovered from
  `../backend/src/scripts/seed.ts` (Maple & Oak, Bloom Beauty, Maya Bennett, …). Writes
  mutate in memory for the life of the server process.
- Interception is **node-side only** (`instrumentation.ts` → `mocks/server.ts`): because the
  browser only ever talks to same-origin Next routes (the proxy + handlers), every
  backend-bound `fetch` originates in the Next process, so one MSW server covers SSR **and**
  browser reads. `mocks/browser.ts` is an optional scaffold, unused by default.
- Mock login issues a `Bearer mock.<userId>` token; once Phase 3 stores it in the access
  cookie, the whole authed surface works against mocks with no extra wiring. Seed logins
  (any password): `maya@collably.app` (creator), `hello@mapleandoak.ca` (business),
  `admin@collably.app` (admin).

## Shared types (the `@shared` alias)

The website reuses the monorepo's canonical domain layer instead of redefining it:

- **Decision:** a TS path alias **`@shared/*` → `../shared/*`** (the root `shared/` package,
  the canonical source; `mobile/_shared` is a generated copy). No extra workspace package.
- `next.config.js` sets `experimental.externalDir: true` so Next compiles that out-of-app
  TS source, and `tsconfig.json` carries the `@shared/*` path mapping.
- Import everything through the barrel: `import { Campaign, REWARD_TYPES } from '@/lib/shared'`.

`@/*` resolves to this app's root (e.g. `@/components/...`, `@/lib/...`).

## Structure

```
app/web/
  app/
    (marketing)/     public marketing: /, /pricing, /about, /blog, …
    (public-app)/    public app views: /explore, /campaign/[id], /business/[id], /creator/[id]
    (auth)/          /login, /signup, /forgot-password, /reset-password/[token]
    (onboarding)/    /onboarding/creator, /onboarding/business
    (dashboard)/     /dashboard/creator/*, /dashboard/business/*
    api/
      backend/[...path]/  same-origin backend proxy (cookie → Bearer)
      health/             liveness probe
    layout.tsx       root layout → Providers
    providers.tsx    Theme → Query → Auth provider tree
    globals.css      Tailwind + shadcn CSS variables (neutral base; Phase 1 remaps)
  components/
    providers/       query / theme / auth providers
  lib/
    config.ts        env-derived config + cookie names (single source)
    constants.ts     shared enums + web-only domain constants
    locations.ts     Canada-first city/region/country autocomplete (from mobile)
    utils.ts         cn() (clsx + tailwind-merge)
    shared.ts        re-export of @shared (domain types + constants)
    format.ts        number/date/countdown/reward helpers (from mobile)
    domain-meta.ts   emoji + gradient maps for the domain enums
    api/
      server.ts      serverApi: server transport (RSC + route handlers)
      client.ts      clientApi: browser transport (→ same-origin proxy)
      http.ts        createHttpClient (fetch core, JSON, error normalize)
      errors.ts      ApiError + normalize (first zod issue)
      types.ts       response envelopes + HttpClient contract
      query-keys.ts  TanStack query keys per resource
      query-client.ts shared defaults + request-scoped server client
      resources/     one typed module per backend resource
      queries/       client hooks + SSR prefetch helper
  mocks/             MSW: db (seed), handlers, node server, browser scaffold
  instrumentation.ts starts the MSW node server in mock mode
  components.json    shadcn/ui config (base color neutral; aliases)
  tailwind.config.ts app palette + shadcn tokens, dark mode via class
```

## Theme

The "blend": the **app's** colors (Meta-blue `#1877F2`, FB-green `#31A24C` for money, grey
`#F0F2F5` surfaces, rounded radii, system sans) on top of the design reference's layouts.
Phase 0 ships the app palette (from `../admin/tailwind.config.ts`) plus shadcn semantic
tokens on a neutral base; **Phase 1** maps the full token table and dark palette.
