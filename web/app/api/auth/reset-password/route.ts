/**
 * POST /api/auth/reset-password: set a new password from a reset token via
 * backend `/auth/reset-password`. The backend auto-logs-in by returning a fresh
 * token pair, so set the session cookies and return the safe user.
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
  token: z.string().min(1, 'token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export async function POST(req: Request) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request';
    return NextResponse.json({ message }, { status: 400 });
  }

  const result = await postAuth('/auth/reset-password', input);
  if (!result.ok) return NextResponse.json(result.data, { status: result.status });

  const auth = result.data as AuthResponse;
  const user = await sessionUserFromAuth(auth);
  const res = NextResponse.json({ user });
  setAuthCookies(res, auth);
  return res;
}
