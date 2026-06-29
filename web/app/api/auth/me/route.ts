/**
 * GET /api/auth/me: the current session user (or `{ user: null }` for guests).
 * Used by `AuthProvider.refresh()` to re-sync client state after actions that
 * change it (e.g. completing onboarding, profile approval). Reads the httpOnly
 * cookie via the shared `getSession()` so it transparently benefits from the
 * in-memory refresh fallback.
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ user: session?.user ?? null });
}
