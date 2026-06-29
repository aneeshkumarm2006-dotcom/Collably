/**
 * Runtime configuration — the single source of truth for environment-derived
 * settings the data layer needs (API URLs, mock toggle, cookie names).
 *
 * `NEXT_PUBLIC_*` vars are inlined into the client bundle; the rest are
 * server-only. Read everything through this module so a rename happens in one
 * place and the browser/server split stays explicit.
 */

/** Coerce a `"true"`/`"false"` env string to a boolean (default false). */
function envFlag(value: string | undefined): boolean {
  return value === 'true';
}

export const config = {
  /**
   * Backend REST base as seen by the browser, including the `/api` suffix
   * (e.g. `http://localhost:4000/api`). Used to build Socket.io/Cloudinary URLs;
   * browser data fetches go through the same-origin proxy, not here directly.
   */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',

  /**
   * Backend base URL as seen from THIS Next server (server→backend, includes
   * `/api`). In Docker/prod this can differ from the public URL. Server
   * Components, route handlers, and the proxy all fetch against this.
   */
  backendInternalUrl:
    process.env.BACKEND_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api',

  /** Socket.io origin — backend base WITHOUT `/api` (matches the mobile convention). */
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000',

  /** When true, run against the in-memory MSW mocks instead of the real backend. */
  useMocks: envFlag(process.env.NEXT_PUBLIC_USE_MOCKS),

  /**
   * Same-origin base path the browser client calls. A catch-all route handler
   * at `app/api/backend/[...path]` forwards each request to the backend with the
   * access cookie attached, so the JWT never reaches client JS.
   */
  clientApiBasePath: '/api/backend',

  /** Cloudinary cloud name for building media URLs (Phase 11). */
  cloudinaryCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',

  /**
   * Google OAuth *web* client ID for Google Identity Services sign-in. Inlined
   * into the client bundle so the GIS button can initialize. Empty when not
   * configured — the Google button then degrades to a disabled placeholder.
   */
  googleOAuthClientId: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? '',

  /**
   * Canonical public origin of the website (no trailing slash) — the base for
   * canonical URLs, Open Graph/Twitter tags, `sitemap.ts`, `robots.ts`, JSON-LD,
   * and the blog RSS feed. Defaults to the production domain.
   */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collably.app').replace(/\/$/, ''),

  /**
   * Web analytics. Provider is one of `plausible` | `ga4` | `none` (default
   * `none` → analytics fully off, scripts never load). Plausible is cookieless
   * (loads without consent); GA4 sets cookies and is gated behind the cookie
   * consent banner. All `NEXT_PUBLIC_*` so the client island can read them.
   */
  analytics: {
    provider: (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? 'none') as
      | 'plausible'
      | 'ga4'
      | 'none',
    /** Plausible site domain (the `data-domain`), e.g. `collably.app`. */
    plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? '',
    /** Plausible script src (self-hosted instances override this). */
    plausibleSrc: process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? 'https://plausible.io/js/script.tagged-events.js',
    /** GA4 measurement ID, e.g. `G-XXXXXXXXXX`. */
    ga4Id: process.env.NEXT_PUBLIC_GA4_ID ?? '',
  },
} as const;

/**
 * Names of the httpOnly session cookies set by the Phase 3 auth route handlers.
 * Defined here (not in Phase 3) so the proxy + server client can read the access
 * token without a circular dependency on the auth module.
 */
export const ACCESS_COOKIE = 'collably_access';
export const REFRESH_COOKIE = 'collably_refresh';
