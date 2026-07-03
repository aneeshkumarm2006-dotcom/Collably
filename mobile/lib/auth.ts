/**
 * JWT persistence via `expo-secure-store` (Keychain on iOS, Keystore on Android).
 *
 * This module is the single source of truth for the access/refresh token pair. It
 * keeps an in-memory mirror so the Axios request interceptor can read the token
 * synchronously, while SecureStore provides durable, encrypted storage across app
 * launches. The Zustand `authStore` and the Axios `api` instance both go through
 * here — they never touch SecureStore directly — which keeps token handling in one
 * place and avoids a circular dependency between the store and the API client.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'collably.accessToken';
const REFRESH_KEY = 'collably.refreshToken';

/**
 * Platform-safe storage. SecureStore is backed by the iOS Keychain / Android
 * Keystore and has *no* web implementation — its web module is an empty stub, so
 * calling `getItemAsync` in the browser throws "getValueWithKeyAsync is not a
 * function". On web we fall back to `localStorage` so the app boots during
 * development. (localStorage is NOT encrypted; web is a dev convenience, the real
 * targets are native where tokens stay in the secure enclave.)
 *
 * The fallback is DEV-ONLY: a production web build refuses to persist tokens in
 * localStorage (any XSS would read them). If web ever becomes a real target,
 * switch its auth to httpOnly cookies first.
 */
const webStorageAllowed = () => Platform.OS === 'web' && __DEV__;

const secureStorage = {
  getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (!webStorageAllowed()) return Promise.resolve(null);
      try {
        return Promise.resolve(globalThis.localStorage?.getItem(key) ?? null);
      } catch {
        return Promise.resolve(null);
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (!webStorageAllowed()) return Promise.resolve(); // prod web: in-memory only
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // Private mode / blocked storage — ignore; session just won't persist.
      }
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // Ignore — nothing to clear.
      }
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

// In-memory mirror of the persisted tokens (synchronous reads for interceptors).
let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Callbacks fired when the session is invalidated (refresh failed / signed out). */
const signOutListeners = new Set<() => void>();

/**
 * Load persisted tokens into memory. Call once at app boot (before the first API
 * request) so an already-logged-in user is restored without a flash of the login
 * screen. Returns the restored pair (or nulls).
 */
export async function loadTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  [accessToken, refreshToken] = await Promise.all([
    secureStorage.getItem(ACCESS_KEY),
    secureStorage.getItem(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}

/** Persist a fresh token pair to memory + SecureStore (e.g. after login/refresh). */
export async function setTokens(pair: TokenPair): Promise<void> {
  accessToken = pair.accessToken;
  refreshToken = pair.refreshToken;
  await Promise.all([
    secureStorage.setItem(ACCESS_KEY, pair.accessToken),
    secureStorage.setItem(REFRESH_KEY, pair.refreshToken),
  ]);
}

/** Wipe tokens from memory + SecureStore (logout / account deletion). */
export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await Promise.all([
    secureStorage.removeItem(ACCESS_KEY),
    secureStorage.removeItem(REFRESH_KEY),
  ]);
}

/** Synchronous read of the current access token (used by the request interceptor). */
export function getAccessToken(): string | null {
  return accessToken;
}

/** Synchronous read of the current refresh token (used by the 401 handler). */
export function getRefreshToken(): string | null {
  return refreshToken;
}

/**
 * Register a listener invoked when the session can no longer be recovered (refresh
 * token rejected). `authStore` uses this to reset state and route back to login.
 * Returns an unsubscribe function.
 */
export function onSignOut(listener: () => void): () => void {
  signOutListeners.add(listener);
  return () => signOutListeners.delete(listener);
}

/** Clear tokens and notify listeners. Called by the API client on unrecoverable 401. */
export async function forceSignOut(): Promise<void> {
  await clearTokens();
  for (const listener of signOutListeners) listener();
}
