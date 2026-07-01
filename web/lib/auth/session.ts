/**
 * Server-side session resolution. `getSession()` reads the httpOnly access cookie,
 * resolves the current user via `GET /auth/me`, and (if the access token is
 * expired but a refresh cookie is present) performs an in-memory refresh and
 * retries once (mirroring the mobile single-flight refresh). It is wrapped in
 * React's `cache()` so every Server Component / layout in a single request shares
 * one `/auth/me` round-trip.
 *
 * NOTE: a Server Component cannot write cookies, so a refresh triggered here is
 * NOT persisted; the new pair is used only for this render. Persisted rotation
 * happens in the same-origin proxy and the auth route handlers (mutable response
 * contexts). The cost of a transient re-refresh on the next request is negligible
 * and keeps this read-only path simple.
 */
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/config';
import type { AuthResponse, MeResponse } from '@/lib/api/types';
import { fetchMe, refreshSession } from './backend';
import { toSessionUser, type SessionUser } from './user';

export interface Session {
  user: SessionUser;
  /** Convenience mirror of `user.approved` (the apply/publish gate). */
  approved: boolean;
}

function toSession(me: MeResponse): Session {
  return { user: toSessionUser(me.user, me.approved), approved: me.approved };
}

/**
 * The current session, or null for guests / invalid sessions. Cached per request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return null;

  // Happy path: a valid access token resolves the user directly.
  if (access) {
    const me = await fetchMe(access);
    if (me) return toSession(me);
  }

  // Access missing/expired: try the refresh token (in-memory, single-flight).
  if (refresh) {
    const refreshed = await refreshSession(refresh);
    if (refreshed) {
      const me = await fetchMe(refreshed.accessToken);
      if (me) return toSession(me);
    }
  }

  return null;
});

/**
 * Build the `SessionUser` to return from an auth route handler. The login/register
 * envelopes don't carry the `approved` flag, so resolve it from `/auth/me` with
 * the just-issued access token; fall back to an optimistic value (admins approved,
 * everyone else "under review") if that call can't complete.
 */
export async function sessionUserFromAuth(auth: AuthResponse): Promise<SessionUser> {
  const me = await fetchMe(auth.accessToken);
  if (me) return toSessionUser(me.user, me.approved);
  return toSessionUser(auth.user, auth.user.role === 'admin');
}
