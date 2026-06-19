import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/backend';

/** Proxy approve/revoke (and suspend) to the backend `PATCH /api/admin/creators/:id`. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body — backend will reject with a validation error
  }
  const res = await adminFetch(`/creators/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
