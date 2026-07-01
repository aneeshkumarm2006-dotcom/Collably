/**
 * POST /api/auth/login: email + password → backend `/auth/login`. On success,
 * stash the access/refresh pair in httpOnly cookies and return the safe session
 * user (no tokens reach client JS). The browser calls this via `AuthProvider.login`.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { postAuth } from '@/lib/auth/backend';
import { setAuthCookies } from '@/lib/auth/cookies';
import { sessionUserFromAuth } from '@/lib/auth/session';
import type { AuthResponse } from '@/lib/api/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: Request) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request';
    return NextResponse.json({ message }, { status: 400 });
  }

  const result = await postAuth('/auth/login', input);
  if (!result.ok) return NextResponse.json(result.data, { status: result.status });

  const auth = result.data as AuthResponse;
  const user = await sessionUserFromAuth(auth);
  const res = NextResponse.json({ user });
  setAuthCookies(res, auth);
  return res;
}
