/**
 * Axios instance for the CollabSpace backend.
 *
 *  - baseURL comes from `lib/env` (LAN IP in dev, prod URL otherwise).
 *  - Request interceptor attaches the JWT access token from `lib/auth`.
 *  - Response interceptor transparently handles a 401 by attempting a single
 *    token refresh (`POST /auth/refresh`), then retrying the original request.
 *    If the refresh itself fails, the session is force-signed-out and the error
 *    propagates so the UI can route back to login.
 *
 * To avoid a circular import (store → api → store), this module depends only on
 * `lib/auth` (the token source of truth), never on the Zustand store. The store
 * subscribes to sign-out events via `onSignOut()`.
 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL, USE_MOCKS } from './env';
import { getAccessToken, getRefreshToken, setTokens, forceSignOut } from './auth';
import { showToast } from './toast';

/** Backend's auth success envelope (see backend `authResponse`). */
type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

/** Normalized API error surfaced to callers (message is safe to show in a toast). */
export type ApiError = {
  status: number;
  message: string;
  /** Original axios error for callers that need response data / codes. */
  cause: AxiosError;
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Demo/showcase mode: serve every request from the in-memory mock world instead
// of a live backend. The request interceptor below still runs (so the bearer
// token reaches the adapter), but no network call is made. Lazy `require` keeps
// the mock data out of the bundle when `USE_MOCKS` is false.
if (USE_MOCKS) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  api.defaults.adapter = require('./mockApi').mockAdapter;
}

// --- Request: attach bearer token --------------------------------------------

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// --- Response: refresh-on-401 then retry once --------------------------------

// A bare client (no interceptors) for the refresh call so a 401 on refresh can't
// recurse back through this same interceptor.
const refreshClient = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

// Single in-flight refresh shared by all queued 401s, so a burst of failed
// requests triggers exactly one refresh round-trip.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<RefreshResponse>('/auth/refresh', { refreshToken })
      .then(async ({ data }) => {
        await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // Attempt a refresh exactly once per request, and never for the refresh route.
    const isAuthRefresh = original?.url?.includes('/auth/refresh');
    if (status === 401 && original && !original._retry && !isAuthRefresh && getRefreshToken()) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return api(original);
      } catch {
        // Refresh failed — unrecoverable. Clear session + notify listeners.
        await forceSignOut();
      }
    }

    return Promise.reject(toApiError(error));
  },
);

/** Pull a human, render-safe string out of whatever shape the backend returned. */
function extractMessage(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    // Nested `{ message: '…' }` (some handlers double-wrap the error).
    const nested = (raw as { message?: unknown }).message;
    if (typeof nested === 'string') return nested;
    // Validation errors as an array of issues — surface the first one.
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === 'string') return first;
      const fm = (first as { message?: unknown })?.message;
      if (typeof fm === 'string') return fm;
    }
  }
  return null;
}

/** Turn an AxiosError into the normalized `ApiError` shape. */
function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as { message?: unknown; error?: unknown } | undefined;
  const message =
    extractMessage(data?.message) ??
    extractMessage(data?.error) ??
    (status === 0 ? 'Network error — check your connection.' : 'Something went wrong.');
  // Network failures (no HTTP response) get a global toast — screens surface HTTP
  // errors inline (FormBanner/ErrorState), but a dropped connection can happen on
  // any request, so it's raised app-wide here (PRD §8.5).
  if (status === 0) showToast({ message, type: 'error' });
  return { status, message, cause: error };
}

/** Type guard so callers can `catch (e) { if (isApiError(e)) ... }`. */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'message' in value &&
    'cause' in value
  );
}
