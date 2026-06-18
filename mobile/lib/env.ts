/**
 * Runtime configuration for the mobile app.
 *
 * The API base URL is resolved in this order:
 *   1. `EXPO_PUBLIC_API_URL` env var (inlined at build time by Expo) — set this in
 *      `.env` for local dev and via EAS env for preview/production builds.
 *   2. In dev, derived from the Metro bundler host so a physical phone running
 *      Expo Go reaches your laptop's LAN IP automatically (localhost won't work
 *      from a real device) — assumes the backend runs on port 4000.
 *   3. A production placeholder (replace before shipping — Phase 18).
 *
 * Always points at the `/api` prefix the backend mounts its routes under.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BACKEND_PORT = 4000;

/** Production backend URL — replaced with the real Render/Railway URL in Phase 18. */
const PRODUCTION_API_URL = 'https://api.collably.app/api';

/** Pull the LAN host (e.g. "192.168.1.5:8081") Metro is served from, dev only. */
function metroHost(): string | null {
  // `hostUri` is the modern field exposed by the dev manifest in Expo Go / dev client.
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  return hostUri.split(':')[0] ?? null;
}

/**
 * Host when running in a browser (Expo web). `Constants.expoConfig.hostUri` is
 * only populated in Expo Go / the dev client, so on web we'd otherwise fall
 * through to the production placeholder — which isn't deployed yet. Use the
 * page's own hostname (usually "localhost") so dev web hits the local backend.
 */
function webHost(): string | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  return window.location.hostname || null;
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/+$/, '');

  if (__DEV__) {
    const host = metroHost() ?? webHost();
    if (host) return `http://${host}:${DEFAULT_BACKEND_PORT}/api`;
  }

  return PRODUCTION_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Google OAuth client IDs (PRD §7.1, Phase 0 §2f). Read from `EXPO_PUBLIC_*` env
 * so they're inlined into the bundle. Each platform uses its own OAuth client:
 * iOS + Android native flows, plus a web client used as the `id_token` audience.
 *
 * All optional — when unset (the Google client hasn't been created yet), the
 * "Continue with Google" button self-hides rather than erroring, mirroring how
 * `lib/notifications` degrades without a projectId. `eas.json` / `.env` supply
 * the real values once the Google Cloud OAuth client exists.
 */
export const GOOGLE_OAUTH = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
} as const;

/** True once at least one Google OAuth client ID is configured for this build. */
export const GOOGLE_OAUTH_CONFIGURED = Boolean(
  GOOGLE_OAUTH.iosClientId || GOOGLE_OAUTH.androidClientId || GOOGLE_OAUTH.webClientId,
);

/**
 * Google Maps SDK key (On-Site Location feature). Read from `EXPO_PUBLIC_*` so
 * it's inlined into the bundle and `app.config.js` embeds the same value in the
 * native build. Maps SDK keys are *not* secret — they're locked by app signature
 * in Google Cloud — so shipping it in the bundle is expected.
 *
 * When unset (no key yet), `MAPS_ENABLED` is false and every map surface renders
 * a "Map coming soon" placeholder instead of a `MapView`. Set the key + run a new
 * dev build and the maps light up with no other changes. Mirrors the
 * `GOOGLE_OAUTH_CONFIGURED` degrade-gracefully pattern above.
 */
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || undefined;

/** True once a Maps SDK key is configured for this build (else "map coming soon"). */
export const MAPS_ENABLED = Boolean(GOOGLE_MAPS_API_KEY);

/** App display version, surfaced in settings / support screens. */
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

export const IS_DEV = __DEV__;
