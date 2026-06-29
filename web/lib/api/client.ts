/**
 * Browser-side data access. Use this in client components / TanStack Query hooks.
 *
 * It calls the SAME-ORIGIN proxy (`/api/backend/...`), which forwards each request
 * to the backend with the httpOnly access cookie attached server-side. The JWT
 * therefore never touches client JS — the browser only ever sees same-origin
 * requests with its own cookie.
 *
 *   import { clientApi } from '@/lib/api/client';
 *   const { data } = await clientApi.campaigns.list({ q: 'cafe' });
 *
 * For auth specifically, do NOT call `clientApi.auth.login` (it would return the
 * JWT to JS) — Phase 3 adds `/api/auth/*` cookie-setting handlers for that.
 */
import { config } from '@/lib/config';
import { createHttpClient } from './http';
import { createResources } from './resources';

const clientHttp = createHttpClient({
  // Relative base → same-origin in the browser. The proxy attaches the cookie.
  baseUrl: config.clientApiBasePath,
  // Browser requests default to the platform's normal caching; reads are still
  // governed by TanStack Query staleness, and the proxy sets `no-store` upstream.
  defaultCache: 'default',
});

/** Typed, same-origin backend client for the browser. */
export const clientApi = createResources(clientHttp);

/** The raw client transport, for one-off calls outside the resource modules. */
export const clientHttpClient = clientHttp;
