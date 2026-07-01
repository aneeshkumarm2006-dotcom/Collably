/**
 * Server-side data access. Use this in Server Components and route handlers.
 *
 * It reads the httpOnly access cookie (set by the Phase 3 auth handlers), attaches
 * it as a `Bearer` token, talks straight to the backend over the internal URL, and
 * disables caching by default (`no-store`) so authed/data pages always render
 * fresh. Mirrors the intent of `admin/lib/backend.ts`, adapted to the website's
 * per-user JWT model.
 *
 *   import { serverApi } from '@/lib/api/server';
 *   const { data } = await serverApi.campaigns.list({ sort: 'newest' });
 *
 * NOTE (Phase 3): refresh-on-401 lands in the proxy + here once the auth handlers
 * exist. For now an expired token simply yields a 401 the caller can handle.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { config, ACCESS_COOKIE } from '@/lib/config';
import { createHttpClient } from './http';
import { createResources } from './resources';

/** Build the per-request auth header from the access cookie (if present). */
async function authHeaders(): Promise<HeadersInit> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  return token ? { authorization: `Bearer ${token}` } : {};
}

const serverHttp = createHttpClient({
  baseUrl: config.backendInternalUrl,
  getHeaders: authHeaders,
  defaultCache: 'no-store',
});

/** Typed, cookie-authenticated backend client for the server. */
export const serverApi = createResources(serverHttp);

/** The raw server transport, for one-off calls outside the resource modules. */
export const serverHttpClient = serverHttp;
