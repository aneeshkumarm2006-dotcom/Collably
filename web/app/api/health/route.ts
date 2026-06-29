import { NextResponse } from 'next/server';

/** Liveness probe for the website's own Next server (not the backend). */
export function GET() {
  return NextResponse.json({ ok: true, app: 'collably-web' });
}
