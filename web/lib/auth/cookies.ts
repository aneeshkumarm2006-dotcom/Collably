/**
 * httpOnly session-cookie writers, shared by the auth route handlers and the
 * same-origin proxy. Cookies are `httpOnly` (never readable from JS), `SameSite=Lax`
 * (survives top-level navigations from links/redirects, blocks cross-site POSTs),
 * and `Secure` in production. Cookie lifetimes track each JWT's own `exp` so a
 * cookie never long-outlives its token; mock tokens (no JWT structure) fall back
 * to sensible defaults.
 */
import type { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/config';

const DEFAULT_ACCESS_MAX_AGE = 60 * 60 * 24 * 7; // 7d, matches backend JWT_EXPIRES_IN
const DEFAULT_REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30d, matches JWT_REFRESH_EXPIRES_IN

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Decode a JWT's `exp` (no signature check) → seconds until it expires. */
function jwtMaxAge(token: string, fallback: number): number {
  const parts = token.split('.');
  if (parts.length !== 3) return fallback; // e.g. mock tokens, use the default
  try {
    const json = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp === 'number') {
      const seconds = Math.floor(payload.exp - Date.now() / 1000);
      if (seconds > 0) return seconds;
    }
  } catch {
    // Malformed payload: fall through to the default.
  }
  return fallback;
}

function baseOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

/** Set both session cookies on a response (after login/register/refresh/reset). */
export function setAuthCookies(res: NextResponse, tokens: TokenPair): void {
  const base = baseOptions();
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: jwtMaxAge(tokens.accessToken, DEFAULT_ACCESS_MAX_AGE),
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: jwtMaxAge(tokens.refreshToken, DEFAULT_REFRESH_MAX_AGE),
  });
}

/** Expire both session cookies on a response (logout / failed refresh). */
export function clearAuthCookies(res: NextResponse): void {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    res.cookies.set(name, '', { httpOnly: true, path: '/', maxAge: 0 });
  }
}
