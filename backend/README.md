# Collably Backend

Standalone **Express + TypeScript** REST API for Collably, backed by MongoDB
(Mongoose). Built incrementally across Phases 2–6 of [`../../_ai_context/TODO.md`](../../_ai_context/TODO.md).

## Stack

- **Express 4** + **TypeScript** (CommonJS output)
- **Mongoose 8** (MongoDB)
- **zod** for input validation
- **jsonwebtoken** + **bcryptjs** for auth (Phase 4)
- **google-auth-library** to verify Google ID tokens (Phase 4)
- `ts-node-dev` for hot-reload dev, `tsc` for production builds

> **Note:** the TODO lists `bcrypt`; this project uses **`bcryptjs`** instead — a
> pure-JS, API-compatible drop-in that needs no native toolchain (avoids
> node-gyp build failures on Windows). Swap back to `bcrypt` later if you want
> native performance and have build tools installed.

## Setup

```bash
cd app/backend
npm install
cp .env.example .env   # then fill in real values (see Phase 0 credentials note)
```

## Scripts

| Script                    | What it does                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev`             | Hot-reload dev server (`ts-node-dev`) on `PORT` (4000)                                                    |
| `npm run build`           | Compile TypeScript → `dist/`                                                                              |
| `npm start`               | Run the compiled server (`node dist/index.js`)                                                            |
| `npm run typecheck`       | Type-check without emitting                                                                               |
| `npm run verify:models`   | Validate all Mongoose models (offline) + optional DB create/read round-trip (needs `npm run build` first) |
| `npm run verify:auth`     | Phase 4 checkpoint: auth primitives offline + optional full HTTP flow (needs `npm run build` first)       |
| `npm run verify:services` | Phase 5 checkpoint: Cloudinary signing, email templates, Expo push (offline) + optional `notify` DB test  |
| `npm run verify:routes`   | Phase 6 checkpoint: request helpers (offline) + full collab-lifecycle HTTP flow + admin (needs a DB)      |
| `npm run seed`            | Populate the DB with realistic sample data (⚠️ wipes collections first; needs a DB)                       |

## Health check

```bash
curl http://localhost:4000/api/health
# { "status": "ok", "service": "collably-backend", "db": "disconnected", ... }
```

`db` reflects the live Mongoose connection state. The server boots and serves
`/api/health` **even without** `MONGODB_URI` set, so deployment can be verified
before the database is wired up.

## Folder structure (PRD §17)

```
src/
  app.ts             Express app assembly (middleware, routes, error handler)
  index.ts           Entry point: connect DB, start server, graceful shutdown
  lib/
    env.ts           Typed environment access (loads .env)
    db.ts            Mongoose connection (retry + logging, non-fatal)
    utils.ts         asyncHandler + shared helpers
    http.ts          objectIdParam, parsePagination, paginated envelope (Phase 6)
    password.ts      bcrypt hash/verify helpers
    jwt.ts           Access + refresh token sign/verify
    google.ts        Google ID-token verification
    serialize.ts     Mongoose docs → client-safe shapes (one toPublic* per entity)
    triggers.ts      PRD §9.2 notification triggers (wrap `notify` per event)
  middleware/
    errorHandler.ts  AppError, notFound, central error handler
    authenticate.ts  Verify JWT, attach req.user (+ optionalAuthenticate; blocks banned)
    authorize.ts     Role guards: authorize(), businessOnly/creatorOnly/adminOnly
  routes/
    index.ts         /api router (mounts feature routers)
    health.ts        GET /api/health
    auth.ts          /api/auth/* (register, login, refresh, reset, google, me)
    profiles.ts      /api/profile/* (business + creator, GET/PUT)
    campaigns.ts     /api/campaigns/* (discovery, CRUD, status, apply)
    applications.ts  /api/applications/* (list, accept/reject, submit, verify)
    notifications.ts /api/notifications (feed, mark-all-read)
    upload.ts        /api/upload/sign (Cloudinary signed params)
    push.ts          /api/push/* (register/remove Expo token)
    reports.ts       /api/reports (file a moderation report)
    admin.ts         /api/admin/* (dashboard, users, campaigns, businesses, creators, reports)
  models/            Mongoose schemas (PRD §5)
    common.ts        Reusable sub-schemas (geoLocation)
    User.ts  BusinessProfile.ts  CreatorProfile.ts
    Campaign.ts  Application.ts  Notification.ts  Report.ts
    index.ts         Barrel — registers every schema
  types/
    express.d.ts     Augments Express Request with user/auth
  scripts/
    verifyModels.ts  Phase 3 checkpoint: validate + create/read each model
    verifyAuth.ts    Phase 4 checkpoint: auth primitives + full HTTP flow
    verifyServices.ts Phase 5 checkpoint: signing, templates, push, notify
    verifyRoutes.ts  Phase 6 checkpoint: helpers + full route surface
    seed.ts          Realistic sample data (dev/staging)
  services/          External integrations (Phase 5)
    cloudinary.ts    Signed image-upload params (secret never leaves backend)
    resend.ts        Email transport + a template per PRD §9.2 trigger
    expoPush.ts      Expo Push transport + unified `notify` dispatcher
    index.ts         Barrel — re-exports the integration surface
```

### Models & the shared workspace

The Mongoose schemas import their enum values (categories, niches, statuses,
…) from [`../../shared/constants`](../shared/constants) so the API and the
mobile app validate against the **same source of truth**. To make this compile,
the backend `tsconfig` sets `rootDir` to the monorepo `app/` dir and includes
`../shared`, so the build output mirrors the source tree:

```
dist/
  backend/src/index.js   ← entry point (npm start runs this)
  shared/...             ← compiled shared constants/types
```

Verify the models any time with:

```bash
npm run build && npm run verify:models
# offline: validates all 6 schemas + prints declared indexes
# with a DB: also inserts a linked graph, reads it back, and checks the
#            unique (campaignId, creatorId) index rejects a double-apply
MONGODB_URI="mongodb+srv://..." npm run verify:models
```

## Auth (Phase 4)

JWT-based auth with role guards, password reset, and Google sign-in. All routes
live under `/api/auth` and validate their body with zod.

| Method | Endpoint                    | Auth   | Body                                                  | Returns                                               |
| ------ | --------------------------- | ------ | ----------------------------------------------------- | ----------------------------------------------------- |
| POST   | `/api/auth/register`        | —      | `name, email, password, role` (`business`\|`creator`) | `201` `{ user, accessToken, refreshToken }`           |
| POST   | `/api/auth/login`           | —      | `email, password`                                     | `200` `{ user, accessToken, refreshToken }`           |
| POST   | `/api/auth/refresh`         | —      | `refreshToken`                                        | `200` `{ user, accessToken, refreshToken }` (rotated) |
| POST   | `/api/auth/forgot-password` | —      | `email`                                               | `200` generic message (+ `devResetToken` in non-prod) |
| POST   | `/api/auth/reset-password`  | —      | `token, password`                                     | `200` `{ user, accessToken, refreshToken }`           |
| POST   | `/api/auth/google`          | —      | `idToken, role?`                                      | `200`/`201` `{ user, ...tokens, isNewUser }`          |
| GET    | `/api/auth/me`              | Bearer | —                                                     | `200` `{ user }`                                      |

**Tokens.** Two stateless JWTs with separate secrets and a `type` claim that is
checked on verify (an access token can't be used as a refresh token, or vice
versa). Send the access token as `Authorization: Bearer <token>`; lifetimes are
controlled by `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`.

**Middleware** (for Phase 6 routes): `authenticate` rejects requests without a
valid access token and loads `req.user`; `optionalAuthenticate` attaches the
user when present but never rejects (guest mode, PRD §8.6); `businessOnly` /
`creatorOnly` / `adminOnly` (and the `authorize(...roles)` factory) guard by role.

**Password reset.** `forgot-password` stores a SHA-256 hash of a random token
(raw token is never persisted) with a `PASSWORD_RESET_TTL_MINUTES` expiry and
emails the reset link via `services/resend.ts` (best-effort — a missing Resend
config never fails the request). In non-production the raw token is also logged
and returned as `devResetToken` so the flow is testable without a verified email
domain. The mobile app opens `collably://reset-password?token=<token>`.

**Google sign-in.** The app sends a Google **ID token**; the server verifies its
signature + audience against `GOOGLE_CLIENT_ID` and finds-or-creates the user
(linking `googleId` to an existing email account on first use). Creating a brand
new account requires a `role`.

Verify the whole stack:

```bash
npm run build && npm run verify:auth
# offline: password hash/verify, JWT sign/verify (+ type/tamper checks), role guards
# with a DB: boots the app and runs register → me → login → refresh → reset end-to-end
MONGODB_URI="mongodb+srv://..." npm run verify:auth
```

A quick manual smoke test against a running server (`npm run dev`):

```bash
# register → capture the accessToken from the response
curl -s -X POST http://localhost:4000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"initialPassw0rd","role":"creator"}'

# call the protected route with the token
curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer <accessToken>"
```

## Services (Phase 5)

External integrations live in `src/services/` so routes just call them. Each is
self-contained and **degrades gracefully** when its provider isn't configured
(handy in dev and on a fresh deploy).

**`cloudinary.ts`** — `createSignedUpload({ folder, publicId?, tags? })` returns
the params the app needs for a direct, signed upload (`cloudName`, `apiKey`,
`timestamp`, `folder`, `signature`, `uploadUrl`). The API **secret never leaves
the backend** (PRD §8.1); the client POSTs the image straight to Cloudinary with
the returned signature. Throws a 500 if Cloudinary isn't configured. Consumed by
`POST /api/upload/sign` (Phase 6).

**`resend.ts`** — `sendEmail({ to, subject, html, text })` over the Resend HTTP
API, plus one pure template function per **PRD §9.2** trigger (`accountCreatedEmail`,
`passwordResetEmail`, `newApplicationEmail`, `applicationAcceptedEmail`,
`applicationRejectedEmail`, `submissionReceivedEmail`, `submissionVerifiedEmail`,
`revisionRequestedEmail`, `campaignExpiringEmail`, `newMatchingCampaignEmail`).
Templates share a branded layout, escape all dynamic values, and ship a plain-text
part. `sendEmail` never throws — it returns `{ sent, reason? }` so email is always
best-effort.

**`expoPush.ts`** — `sendExpoPush(messages[])` talks to the Expo Push API
(`https://exp.host/--/api/v2/push/send`), validating token format and chunking at
100/request. On top of it, **`notify(opts)`** is the one call Phase 6 routes use
for every trigger: it **creates the in-app `Notification` doc, sends the push, and
sends the email** in a single step, honouring per-channel prefs. The in-app
Notification is the source of truth and is always written; push/email are
best-effort side channels whose failures are logged, not thrown. Pass `push: false`
for push-less triggers (account-created, password-reset) and omit `email` for
in-app-only ones.

```bash
npm run build && npm run verify:services
# offline: Cloudinary signature determinism, all 10 email templates, Expo token
#          validation + chunking
# with a DB: also runs notify() and asserts the Notification is written while
#            push/email degrade gracefully
MONGODB_URI="mongodb+srv://..." npm run verify:services
```

## API routes (Phase 6 — PRD §18)

Every feature router mounts under `/api`. All bodies are validated with zod (a
failure returns `400` `{ error: { message, issues[] } }`); errors are normalised
by the central handler into `{ error: { message, ... } }`. **Auth** column:
_Bearer_ = valid access token required; _Bearer¹_ = optional (guest-readable,
PRD §8.6); a role means that role (or `admin`) is required.

List endpoints share a pagination contract — `?page=` (default 1) and `?limit=`
(default 20, clamped to 50) — and return
`{ data[], page, limit, total, totalPages }`. Where a response embeds joined
data (e.g. a campaign's `business`, an application's `campaign`/`creator`), it's
attached alongside the id when the ref is populated.

### Profiles — `/api/profile`

| Method | Endpoint                | Auth     | Notes                                                           |
| ------ | ----------------------- | -------- | --------------------------------------------------------------- |
| GET    | `/api/profile/business` | business | Own profile; `404` until onboarding creates it                  |
| PUT    | `/api/profile/business` | business | Upsert (`201` on create, `200` on update); marks user onboarded |
| GET    | `/api/profile/creator`  | creator  | Own profile                                                     |
| PUT    | `/api/profile/creator`  | creator  | Upsert; portfolio capped at 6 items                             |

### Campaigns — `/api/campaigns`

| Method | Endpoint                    | Auth     | Notes                                                              |
| ------ | --------------------------- | -------- | ------------------------------------------------------------------ |
| GET    | `/api/campaigns`            | Bearer¹  | Discovery feed (filters/sort/ranking/pagination — see below)       |
| POST   | `/api/campaigns`            | business | Create; `status` `Draft` (default) or `Active`                     |
| GET    | `/api/campaigns/:id`        | Bearer¹  | Single campaign + its business                                     |
| PUT    | `/api/campaigns/:id`        | business | Owner only; can't shrink `spotsTotal` below accepted count (`409`) |
| DELETE | `/api/campaigns/:id`        | business | Owner or admin; cascades the campaign's applications               |
| PATCH  | `/api/campaigns/:id/status` | business | Enforces the PRD §12 transition machine (`409` on illegal)         |
| POST   | `/api/campaigns/:id/apply`  | creator  | One-apply-per-campaign; requires `Active` + spots left (PRD §11)   |

**Discovery query params** (PRD §13, all optional): `category`, `rewardType`,
`tags` (comma-separated `$in`); `platform` (matches that platform or `Any`);
`location` (`"Remote"` → remote campaigns, else city match); `followersBucket`
(`under1k`\|`1k-10k`\|`10k-50k`\|`50k+`); `q` (title/description search);
`sort` (`relevance`\|`newest`\|`deadline`\|`most_applied`\|`fewest_spots`);
`businessId` (one business's public campaigns); `mine=true` (a business's own
campaigns across all statuses, `+status`). Public callers only ever see non-spam
`Active` campaigns. For a signed-in **creator** on the default sort, results are
ranked by niche/location relevance (featured campaigns float to the top).

### Applications — `/api/applications`

| Method | Endpoint                       | Auth     | Notes                                                                   |
| ------ | ------------------------------ | -------- | ----------------------------------------------------------------------- |
| GET    | `/api/applications`            | Bearer   | Scoped: creator=own, business=theirs (`?campaignId`), admin=all         |
| GET    | `/api/applications/:id`        | Bearer   | Participants or admin only                                              |
| PATCH  | `/api/applications/:id`        | business | `{ status: Accepted\|Rejected }`; accept consumes a spot atomically     |
| POST   | `/api/applications/:id/submit` | creator  | `{ submissionLink, submissionProof?, submissionNote? }` (when Accepted) |
| PATCH  | `/api/applications/:id/verify` | business | `{ action: verify\|revision\|fail, note? }`                             |

`verify` → collab `Completed` + creator/business counters bump; `revision` →
kept `Accepted` (creator resubmits); `fail` → `Cancelled` and the spot is
returned to the campaign. Each transition fires the matching PRD §9.2
notification (in-app + push + email, best-effort).

### Notifications / Upload / Push / Reports

| Method | Endpoint                  | Auth   | Notes                                                          |
| ------ | ------------------------- | ------ | -------------------------------------------------------------- |
| GET    | `/api/notifications`      | Bearer | Newest-first feed + `unreadCount`; `?unread=true` to filter    |
| PATCH  | `/api/notifications/read` | Bearer | Mark all the user's notifications read                         |
| POST   | `/api/upload/sign`        | Bearer | `{ folder?, publicId?, tags? }` → Cloudinary signed params     |
| POST   | `/api/push/register`      | Bearer | `{ pushToken }` (validated Expo token)                         |
| DELETE | `/api/push/token`         | Bearer | Clear the push token (logout)                                  |
| POST   | `/api/reports`            | Bearer | `{ targetType, targetId, reason }` — files a moderation report |

### Admin — `/api/admin` (all `admin`)

| Method | Endpoint                    | Notes                                                      |
| ------ | --------------------------- | ---------------------------------------------------------- |
| GET    | `/api/admin/dashboard`      | Stat cards (users split, campaigns, applications, signups) |
| GET    | `/api/admin/users`          | `?role&q&banned` + pagination                              |
| PATCH  | `/api/admin/users/:id`      | `{ isBanned?, role? }` (can't ban/delete yourself)         |
| DELETE | `/api/admin/users/:id`      | Delete user + cascade their profile/campaigns/applications |
| GET    | `/api/admin/campaigns`      | `?status&q&flagged` + pagination                           |
| PATCH  | `/api/admin/campaigns/:id`  | `{ forceClose?, isFeatured?, isSpam? }`                    |
| DELETE | `/api/admin/campaigns/:id`  | Delete campaign + its applications                         |
| GET    | `/api/admin/businesses`     | `?q` + pagination                                          |
| PATCH  | `/api/admin/businesses/:id` | `{ isVerified?, isSuspended? }`                            |
| GET    | `/api/admin/creators`       | Pagination                                                 |
| PATCH  | `/api/admin/creators/:id`   | `{ isSuspended }`                                          |
| GET    | `/api/admin/reports`        | `?status` (`open`\|`dismissed`\|`actioned`) + pagination   |
| PATCH  | `/api/admin/reports/:id`    | `{ status: dismissed\|actioned }`                          |

> A **banned** user (`isBanned`) is rejected by `authenticate` with `403` even
> with a valid token; suspended businesses/creators (`isSuspended`) are flagged
> for the mobile UI to lock.

Verify the whole surface end-to-end:

```bash
npm run build && npm run verify:routes
# offline: objectIdParam, parsePagination (clamp), paginated envelope
# with a DB: register business+creator → profiles → publish campaign → apply
#            (+ double-apply 409) → accept (spot consumed) → submit → verify
#            (counters bump) → notifications → push → admin dashboard + ban
MONGODB_URI="mongodb+srv://..." npm run verify:routes
```

Seed sample data for manual testing (all logins use password `Password123`):

```bash
npm run build && MONGODB_URI="mongodb+srv://..." npm run seed
# admin@collably.app, business1..3@collably.app, creator1..5@collably.app
```

## Deploy (Render / Railway)

1. Create a Web Service pointing at this folder.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Set env vars from `.env.example` (at minimum `JWT_SECRET`, `MONGODB_URI`).
5. Confirm `GET /api/health` returns `200` on the live URL.
