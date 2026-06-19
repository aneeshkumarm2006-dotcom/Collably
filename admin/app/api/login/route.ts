import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from '@/lib/session';

export async function POST(req: Request) {
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
  if (password.length === 0 || password !== expected) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

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
