/**
 * Public, cacheable server-side data access for SSG/ISR of guest-facing pages
 * (campaign detail, business/creator profiles, the landing live-rail).
 *
 * Unlike `serverApi`, this transport reads **no cookie** and attaches **no**
 * `Authorization` header, so a request never varies per-user and Next can cache
 * the rendered page. It defaults to an ISR `revalidate` window instead of
 * `no-store`, so public pages are statically served and refreshed in the
 * background. Because there's no cookie, the backend returns the **public**
 * projection (e.g. a campaign's fuzzed/approximate location), exactly what a
 * shared, cacheable page should expose. Per-user state (apply status, precise
 * location for accepted creators) hydrates client-side via the AuthProvider /
 * the same-origin proxy, or lives on the authed dashboard.
 *
 *   import { publicApi } from '@/lib/api/public';
 *   export const revalidate = 120;
 *   const { campaign } = await publicApi.campaigns.get(id);
 */
import 'server-only';
import { config } from '@/lib/config';
import { createHttpClient } from './http';
import { createResources } from './resources';

/** Default ISR window (seconds) for public reads; pages can still override per-call. */
export const PUBLIC_REVALIDATE_SECONDS = 120;

const publicHttp = createHttpClient({
  baseUrl: config.backendInternalUrl,
  defaultNext: { revalidate: PUBLIC_REVALIDATE_SECONDS },
});

/** Typed, cookieless backend client for public (ISR-cacheable) pages. */
export const publicApi = createResources(publicHttp);
