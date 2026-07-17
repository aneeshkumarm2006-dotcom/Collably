/**
 * Sign in with Apple hook — required by App Store Guideline 4.8.
 *
 * Because we offer Google sign-in (a third-party login), Apple requires we also
 * offer an equivalent privacy-respecting option, which in practice means Sign in
 * with Apple. Without it, iOS review rejects the app.
 *
 * Flow: `start()` shows the native Apple sheet → we get an **identityToken** (a
 * signed JWT) → POST it to `/auth/apple` (the server verifies the signature +
 * audience against Apple's public keys, then finds-or-creates the user) →
 * `authStore.signIn()`. Mirrors the Google flow exactly.
 *
 * Two Apple quirks handled here:
 *  - The user's **name is only returned on the very first authorization**, and only
 *    to the client — it's never in the token. We forward it once so the account can
 *    be named; later sign-ins legitimately omit it.
 *  - "Hide My Email" returns a private relay address. That's a real, deliverable
 *    address — treated like any other email.
 *
 * iOS-only (Apple's sheet doesn't exist on Android), and it needs a native build —
 * the module is `require`d lazily and guarded so a binary without it can't
 * red-screen the whole app (same rationale as `googleAuth.ts`).
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api, isApiError } from './api';
import { useAuthStore, type AuthPayload } from '@/store/authStore';
import type { UserRole } from '@/constants';

type AppleModule = typeof import('expo-apple-authentication');

let cachedModule: AppleModule | null = null;
let moduleMissing = false;

/** Lazily load the native module; returns null (once) if it isn't in the binary. */
function loadApple(): AppleModule | null {
  if (cachedModule) return cachedModule;
  if (moduleMissing) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-apple-authentication') as AppleModule;
    return cachedModule;
  } catch {
    moduleMissing = true;
    return null;
  }
}

/** Backend `/auth/apple` envelope — the standard auth payload plus a new-user flag. */
type AppleAuthResponse = AuthPayload & { isNewUser: boolean };

export type AppleSignInOptions = {
  /** Role to create the account as, when Apple returns a brand-new user. */
  role?: Extract<UserRole, 'business' | 'creator'>;
  /** Surface a user-facing error (shown inline / as a toast by the screen). */
  onError?: (message: string) => void;
};

export type AppleSignIn = {
  /** True only on iOS devices that support Apple sign-in (else hide the button). */
  available: boolean;
  signingIn: boolean;
  start: () => void;
};

export function useAppleSignIn(options: AppleSignInOptions = {}): AppleSignIn {
  const { role, onError } = options;
  const signIn = useAuthStore((s) => s.signIn);
  const [signingIn, setSigningIn] = useState(false);
  const [available, setAvailable] = useState(false);
  const [mounted, setMounted] = useState(true);
  useEffect(() => () => setMounted(false), []);

  // Apple sign-in exists only on iOS, and only on new-enough versions — ask the
  // module rather than assuming, so the button never shows where it can't work.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const mod = loadApple();
    if (!mod) return;
    let cancelled = false;
    void mod
      .isAvailableAsync()
      .then((ok) => {
        if (!cancelled) setAvailable(ok);
      })
      .catch(() => {
        /* treat any failure as "not available" — the button stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function start(): Promise<void> {
    const mod = loadApple();
    if (!mod) {
      onError?.('Apple sign-in needs a new app build to work. Please update the app.');
      return;
    }

    setSigningIn(true);
    try {
      const credential = await mod.signInAsync({
        requestedScopes: [mod.AppleAuthenticationScope.FULL_NAME, mod.AppleAuthenticationScope.EMAIL],
      });

      if (!credential.identityToken) {
        onError?.("Apple sign-in didn't return a token. Please try again.");
        return;
      }

      // Name arrives ONLY on the first authorization — send it when present so the
      // account can be created with a real name.
      const first = credential.fullName?.givenName ?? '';
      const last = credential.fullName?.familyName ?? '';
      const fullName = `${first} ${last}`.trim() || undefined;

      const { data } = await api.post<AppleAuthResponse>('/auth/apple', {
        identityToken: credential.identityToken,
        role,
        fullName,
      });
      await signIn(data);
      // No manual navigation: the root auth gate reacts to the new session.
    } catch (err) {
      // The user dismissing the Apple sheet is not an error worth surfacing.
      if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      onError?.(isApiError(err) ? err.message : 'Could not sign in with Apple.');
    } finally {
      if (mounted) setSigningIn(false);
    }
  }

  return {
    available,
    signingIn,
    start: () => void start(),
  };
}
