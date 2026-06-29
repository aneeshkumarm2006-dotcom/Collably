/**
 * POST /api/auth/register — create an account (role: business | creator) via
 * backend `/auth/register`, set the session cookies, and return the safe user.
 * New accounts are never onboarded yet, so the client routes them into the
 * onboarding flow.
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
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(['business', 'creator']),
});

export async function POST(req: Request) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request';
    return NextResponse.json({ message }, { status: 400 });
  }

  const result = await postAuth('/auth/register', input);
  if (!result.ok) return NextResponse.json(result.data, { status: result.status });

  const auth = result.data as AuthResponse;
  const user = await sessionUserFromAuth(auth);
  const res = NextResponse.json({ user });
  setAuthCookies(res, auth);
  return res;
}
