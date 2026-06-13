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
  googleClientId: str('GOOGLE_CLIENT_ID'),
} as const;

/** Origins for the CORS middleware: `true` (reflect any) or an array. */
export function corsOrigins(): true | string[] {
  if (env.corsOrigin === '*') return true;
  return env.corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
