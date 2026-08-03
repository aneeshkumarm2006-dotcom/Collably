import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/backend';

/**
 * Proxy signed-upload params to the backend `POST /api/admin/upload/sign`.
 * Returns Cloudinary params the browser uses to upload a support-chat image
 * directly to Cloudinary. The API secret never reaches the client.
 */
export async function POST() {
  const res = await adminFetch('/upload/sign', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
