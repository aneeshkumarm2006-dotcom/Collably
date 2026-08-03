import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/backend';

/** Proxy the reports list to the backend `GET /api/admin/reports`, forwarding the query string. */
export async function GET(req: Request) {
  const qs = new URL(req.url).search;
  const res = await adminFetch(`/reports${qs}`);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
