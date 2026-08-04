import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/backend';

/** Proxy the business message thread to the backend `GET /api/admin/businesses/:id/messages`. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await adminFetch(`/businesses/${id}/messages`);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

/** Proxy sending a message to the backend `POST /api/admin/businesses/:id/messages`. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body — backend will reject with a validation error
  }
  const res = await adminFetch(`/businesses/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
