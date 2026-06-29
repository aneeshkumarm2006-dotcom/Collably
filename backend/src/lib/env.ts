import dotenv from 'dotenv';

// Load `.env` once, as early as possible, before anything reads process.env.
dotenv.config();

/** Read an optional env var, falling back to a default. */
function str(key: string, fallback = ''): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

/** Read an integer env var with a default. */
function int(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Centralised, typed view of the environment. Import this instead of reading
 * `process.env` directly so every consumer sees the same parsed values.
 */
export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  isProd: str('NODE_ENV', 'development') === 'production',
  port: int('PORT', 4000),

  /** "*" or a comma-separated allowlist of origins. */
  corsOrigin: str('CORS_ORIGIN', '*'),

  /**
   * Public base URL of the Collably website (e.g. `https://collably.app`), no
   * trailing slash. When set, transactional emails that point at a user-facing
   * screen (currently the password reset) link to the **web** app instead of the
   * mobile `collably://` deep link. Leave unset to preserve the mobile deep-link
   * behavior (e.g. before the website is deployed).
   */
  webAppUrl: str('WEB_APP_URL').replace(/\/+$/, ''),

  jwtSecret: str('JWT_SECRET'),
  /** Access-token lifetime (e.g. "15m", "7d"). */
  jwtExpiresIn: str('JWT_EXPIRES_IN', '7d'),
  /**
   * Refresh-token signing secret. Falls back to a derived value of `JWT_SECRET`
   * so refresh tokens still use a *different* key than access tokens even when
   * not configured separately — set it explicitly in production.
   */
  jwtRefreshSecret: str('JWT_REFRESH_SECRET') || `${str('JWT_SECRET')}:refresh`,
  /** Refresh-token lifetime. */
  jwtRefreshExpiresIn: str('JWT_REFRESH_EXPIRES_IN', '30d'),
  /** How long a password-reset token stays valid, in minutes. */
  passwordResetTtlMinutes: int('PASSWORD_RESET_TTL_MINUTES', 60),

  mongodbUri: str('MONGODB_URI'),

  cloudinary: {
    cloudName: str('CLOUDINARY_CLOUD_NAME'),
    apiKey: str('CLOUDINARY_API_KEY'),
    apiSecret: str('CLOUDINARY_API_SECRET'),
  },

  resend: {
    apiKey: str('RESEND_API_KEY'),
    from: str('RESEND_FROM'),
  },

  expoAccessToken: str('EXPO_ACCESS_TOKEN'),

  /**
   * Google OAuth client IDs the server accepts as ID-token audiences. The mobile
   * app (`expo-auth-session`) issues an ID token whose `aud` is the client ID for
   * the *current platform* — the web client on Expo web, but the iOS/Android
   * native client on a device build. The server therefore verifies against every
   * configured client (see `googleAudiences()`), or native sign-in is rejected as
   * "Invalid Google token". The web client is also the audience for any web/admin
   * sign-in. iOS/Android are optional — set them once those OAuth clients exist.
   */
  googleClientId: str('GOOGLE_CLIENT_ID'),
  googleIosClientId: str('GOOGLE_IOS_CLIENT_ID'),
  googleAndroidClientId: str('GOOGLE_ANDROID_CLIENT_ID'),

  /**
   * Shared secret for server-to-server admin access (the Next.js admin dashboard).
   * When set, a request carrying `x-admin-api-key: <this>` is treated as an admin
   * on the `/api/admin/*` routes without a JWT. Leave unset to disable the key path
   * entirely (the JWT admin path always remains available).
   */
  adminApiKey: str('ADMIN_API_KEY'),

  /**
   * Server-side Google Geocoding API key (On-Site Location feature). Used only
   * by `services/geocoding` to turn typed addresses ⇄ coordinates on save. Never
   * shipped to the client. Leave unset → geocoding self-disables ("coming soon")
   * and the rest of the location feature still works via manual pin coordinates.
   */
  googleGeocodingApiKey: str('GOOGLE_GEOCODING_API_KEY'),
} as const;

/**
 * Every configured Google OAuth client ID — the set of accepted ID-token
 * audiences. Empty when Google sign-in isn't configured yet (the verifier then
 * fails closed with a clear 500). Order is web, iOS, Android.
 */
export function googleAudiences(): string[] {
  return [env.googleClientId, env.googleIosClientId, env.googleAndroidClientId].filter(Boolean);
}

/** Origins for the CORS middleware: `true` (reflect any) or an array. */
export function corsOrigins(): true | string[] {
  if (env.corsOrigin === '*') return true;
  return env.corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Fail-closed startup checks for security-critical config. Throws in production
 * (refuse to boot insecurely); warns in dev so local work isn't blocked.
 * Call once at boot, before the server starts listening.
 */
export function assertSecureConfig(): void {
  const problems: string[] = [];
  if (env.jwtSecret.length < 32) problems.push('JWT_SECRET must be set and at least 32 characters.');
  if (!process.env.JWT_REFRESH_SECRET) {
    problems.push('JWT_REFRESH_SECRET is not set (refresh secret is currently derived from JWT_SECRET — set a separate value).');
  }
  if (env.corsOrigin === '*') problems.push('CORS_ORIGIN is "*" — set an explicit allowlist.');

  if (problems.length === 0) return;
  // Warn loudly (in prod logs too) but DO NOT crash the server — these are
  // config hardening items, and failing to boot a live API is worse. Fix the
  // env in the host dashboard, then this goes quiet.
  const where = env.isProd ? 'PRODUCTION' : 'dev';
  // eslint-disable-next-line no-console
  console.warn(`[env] ⚠ insecure config (${where}) — fix in host env vars:\n  - ${problems.join('\n  - ')}`);
}
