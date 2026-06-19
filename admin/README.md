# Collably Admin Dashboard

A password-gated Next.js (App Router) dashboard to **verify creators and businesses**.
It proxies the Collably Express backend's `/api/admin/*` endpoints server-side using a
shared API key, so all moderation logic stays in the backend.

## What it does

- **Login** with a single hardcoded password (`ADMIN_DASHBOARD_PASSWORD`). The session is a
  signed, httpOnly cookie; every route is gated by `middleware.ts`.
- **Creators** page — each creator's name, email, niches, bio, and **submitted social
  handle(s) with a clickable link** (the thing you verify), plus **Approve / Revoke**.
- **Businesses** page — full business details + owner email, plus **Approve / Revoke**.
- Filter tabs: **All / Under review / Verified**.

A creator/business with `isVerified: false` is "under review": in the mobile app they can
explore but creators can't apply and businesses can't publish (only save drafts). Verifying
them here flips the gate.

## Setup

1. **Backend** must be running and reachable, with `ADMIN_API_KEY` set in its `.env`.
2. Copy env and fill values (already created as `.env.local` during setup):

   ```
   cp .env.example .env.local
   ```

   | Variable | Meaning |
   | --- | --- |
   | `ADMIN_DASHBOARD_PASSWORD` | The password the admin types to log in. |
   | `ADMIN_SESSION_SECRET` | Secret used to sign the session cookie. |
   | `BACKEND_API_URL` | Where the Express backend lives (e.g. `http://localhost:4000`). |
   | `ADMIN_API_KEY` | Must match `ADMIN_API_KEY` in the backend `.env`. |

3. Install and run:

   ```
   npm install
   npm run dev      # http://localhost:3000
   ```

## Scripts

- `npm run dev` — dev server on port 3000
- `npm run build` / `npm run start` — production build / serve
- `npm run typecheck` — `tsc --noEmit`
