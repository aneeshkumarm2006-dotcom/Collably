import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from '@/lib/session';
import { clientIp, isLocked, registerFailure, clearAttempts } from '@/lib/rate-limit';

/** Constant-time password compare — hash both to a fixed 32 bytes so the compare
 * is length-independent and never leaks timing about the real password. */
function passwordMatches(candidate: string, expected: string): boolean {
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (isLocked(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 },
    );
  }

  let password = '';
  try {
    const body = (await req.json()) as { password?: unknown };
    if (typeof body?.password === 'string') password = body.password;
  } catch {
    // empty / invalid body — treated as a wrong password below
  }

  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_DASHBOARD_PASSWORD is not configured on the server.' },
      { status: 500 },
    );
  }
  if (password.length === 0 || !passwordMatches(password, expected)) {
    registerFailure(ip);
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  clearAttempts(ip);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
