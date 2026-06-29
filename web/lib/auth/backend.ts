/**
 * Thin server→backend helpers for the auth route handlers. They talk to the
 * backend over `BACKEND_INTERNAL_URL` (so MSW intercepts them in mock mode, the
 * same as every other server fetch) and never touch cookies themselves; the
 * route handlers own cookie writes. Kept separate from `lib/api/server.ts`
 * because auth requests must NOT carry the (possibly stale) access cookie as a
 * Bearer header, and the refresh/me calls run with an explicit token instead.
 */
import 'server-only';
import { config } from '@/lib/config';
import type { AuthResponse, MeResponse } from '@/lib/api/types';

export interface BackendResult {
  ok: boolean;
  status: number;
  /** The parsed JSON body (passed through verbatim on error). */
  data: unknown;
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** POST an unauthenticated auth request (login/register/google/forgot/reset). */
export async function postAuth(path: string, body: unknown): Promise<BackendResult> {
  try {
    const res = await fetch(`${config.backendInternalUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    return { ok: res.ok, status: res.status, data: await parse(res) };
  } catch {
    return {
      ok: false,
      status: 502,
      data: { message: 'Unable to reach the server. Please try again.' },
    };
  }
}

/** `GET /auth/me` with an explicit access token. Returns null on any failure. */
export async function fetchMe(accessToken: string): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${config.backendInternalUrl}/auth/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await parse(res);
    // Treat an unexpected body (no `user`) as no session rather than crashing the
    // session mapper, which defends against a stale/invalid token yielding an odd 200.
    if (!data || typeof data !== 'object' || !(data as { user?: unknown }).user) return null;
    return data as MeResponse;
  } catch {
    return null;
  }
}

/**
 * Exchange a refresh token for a fresh access/refresh pair. Returns null when the
 * refresh token is rejected (the caller then clears the session). A module-level
 * single-flight map dedupes concurrent refreshes for the same token within this
 * server process, mirroring the mobile client's single in-flight refresh so a
 * burst of 401s triggers exactly one `/auth/refresh` round-trip.
 */
const inflight = new Map<string, Promise<AuthResponse | null>>();

export function refreshSession(refreshToken: string): Promise<AuthResponse | null> {
  const existing = inflight.get(refreshToken);
  if (existing) return existing;

  const promise = doRefresh(refreshToken).finally(() => {
    inflight.delete(refreshToken);
  });
  inflight.set(refreshToken, promise);
  return promise;
}

async function doRefresh(refreshToken: string): Promise<AuthResponse | null> {
  const result = await postAuth('/auth/refresh', { refreshToken });
  if (!result.ok) return null;
  return result.data as AuthResponse;
}
