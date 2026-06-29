/**
 * POST /api/auth/google — verify a Google ID token (obtained client-side from the
 * Google Identity Services button with the *web* client ID) via backend
 * `/auth/google`, set the session cookies, and return the safe user plus
 * `isNewUser` so the client can route brand-new accounts into onboarding. A `role`
 * is required only when the Google account is new.
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
  idToken: z.string().min(1, 'idToken is required'),
  role: z.enum(['business', 'creator']).optional(),
});

export async function POST(req: Request) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request';
    return NextResponse.json({ message }, { status: 400 });
  }

  const result = await postAuth('/auth/google', input);
  if (!result.ok) return NextResponse.json(result.data, { status: result.status });

  const auth = result.data as AuthResponse;
  const user = await sessionUserFromAuth(auth);
  const res = NextResponse.json({ user, isNewUser: Boolean(auth.isNewUser) });
  setAuthCookies(res, auth);
  return res;
}
