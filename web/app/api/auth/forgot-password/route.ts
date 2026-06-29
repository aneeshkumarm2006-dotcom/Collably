/**
 * POST /api/auth/forgot-password — start a password reset via backend
 * `/auth/forgot-password`. The backend always responds 200 with a generic message
 * (anti-enumeration), optionally including `devResetToken` in non-production; both
 * are passed through verbatim. No cookies are touched.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { postAuth } from '@/lib/auth/backend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().trim().email('A valid email is required'),
});

export async function POST(req: Request) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request';
    return NextResponse.json({ message }, { status: 400 });
  }

  const result = await postAuth('/auth/forgot-password', input);
  return NextResponse.json(result.data, { status: result.status });
}
