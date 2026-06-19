/**
 * Server-only client for the Collably backend admin API. Injects the shared
 * `x-admin-api-key` so the dashboard never needs a JWT, and is never bundled to
 * the browser (only imported from server components / route handlers).
 */

const BASE_URL = process.env.BACKEND_API_URL ?? 'http://localhost:4000';

function apiKey(): string {
  return process.env.ADMIN_API_KEY ?? '';
}

export async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}/api/admin${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-admin-api-key': apiKey(),
      ...((init?.headers as Record<string, string>) ?? {}),
    },
    cache: 'no-store',
  });
}

export async function adminGet<T>(path: string): Promise<T> {
  const res = await adminFetch(path);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend responded ${res.status} for GET ${path}${body ? ` — ${body}` : ''}`);
  }
  return (await res.json()) as T;
}
