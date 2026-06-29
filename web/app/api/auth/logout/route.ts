/**
 * POST /api/auth/logout — clear the session cookies. The backend uses stateless
 * JWTs (no server-side session to revoke) and push tokens are mobile-only, so
 * this is purely a cookie wipe.
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
