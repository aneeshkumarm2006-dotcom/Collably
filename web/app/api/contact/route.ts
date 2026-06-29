/**
 * Contact form endpoint. Validates the submission server-side and records it.
 *
 * The backend has no contact resource yet, so for now this logs the message
 * server-side and acknowledges. Wiring it to email/Resend (or a backend
 * `/contact` route) is a drop-in change here; the client contract stays the same.
 */
import { NextResponse } from 'next/server';
import { contactSchema } from '@/lib/contact';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { message: first?.message ?? 'Please check the form and try again' },
      { status: 422 },
    );
  }

  const { name, email, topic } = parsed.data;
  // TODO(Phase 7+/email): forward to Resend or a backend /contact route.
  console.info(`[contact] ${topic} message from ${name} <${email}>`);

  return NextResponse.json({ ok: true });
}
