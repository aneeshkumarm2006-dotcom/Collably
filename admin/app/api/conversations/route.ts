import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/backend';

/** Proxy the support inbox to the backend `GET /api/admin/conversations`. */
export async function GET() {
  const res = await adminFetch('/conversations');
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
