/**
 * GET /api/socket-token — hands the browser a valid access token for the
 * Socket.io handshake (Phase 9). The JWT lives in an httpOnly cookie the client
 * can't read, so this server route reads it, validates it against `/auth/me`, and
 * — if it's expired but a refresh cookie is present — rotates the pair (persisting
 * the new cookies on the response) before returning the fresh token. Returns
 * `{ token: null }` with 401 for guests / unrecoverable sessions so the client
 * simply skips connecting.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/config';
import { fetchMe, refreshSession } from '@/lib/auth/backend';
import { setAuthCookies } from '@/lib/auth/cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  const refresh = store.get(REFRESH_COOKIE)?.value;

  // Happy path: the current access token still resolves a session.
  if (access && (await fetchMe(access))) {
    return NextResponse.json({ token: access });
  }

  // Access missing/expired — rotate via the refresh token and persist the pair.
  if (refresh) {
    const refreshed = await refreshSession(refresh);
    if (refreshed) {
      const res = NextResponse.json({ token: refreshed.accessToken });
      setAuthCookies(res, refreshed);
      return res;
    }
  }

  return NextResponse.json({ token: null }, { status: 401 });
}
