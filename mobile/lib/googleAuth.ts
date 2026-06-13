/**
 * Google sign-in hook (PRD §7.1). Wraps `expo-auth-session`'s Google provider so
 * the login/signup screens get a one-call "Continue with Google" button.
 *
 * Flow: `start()` opens the native Google consent screen → on success we receive a
 * Google **ID token** → POST it to the backend `/auth/google` (which verifies the
 * signature + audience, then finds-or-creates the user) → `authStore.signIn()` with
 * the returned token pair. The root auth gate then routes the user onward
 * (onboarding for a brand-new account, role home otherwise).
 *
 * Self-degrading: when no `EXPO_PUBLIC_GOOGLE_*` client IDs are configured (see
 * `lib/env`), `available` is false and screens hide the button entirely — the rest
 * of the auth flow keeps working. This mirrors `lib/notifications` degrading
 * without a projectId, so a fresh checkout runs before Phase 0 §2f is finished.
 *
 * `role` is only consumed by the backend when the Google account is brand new (it
 * needs to know which profile to build); for an existing account it's ignored.
 */
import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { api, isApiError } from './api';
import { GOOGLE_OAUTH, GOOGLE_OAUTH_CONFIGURED } from './env';
import { useAuthStore, type AuthPayload } from '@/store/authStore';
import type { UserRole } from '@/constants';

// Required so the auth session popup can dismiss itself and return control to the
// app on web / managed dev. No-op on native but harmless and recommended.
void WebBrowser.maybeCompleteAuthSession();

// `expo-auth-session`'s Google provider asserts a client ID for the *current*
// platform is defined and throws a render-time invariant if it isn't (see
// `providers/ProviderUtils.invariantClientId`) — it does NOT return a null request
// as the self-degrading design below assumed. The provider falls back to the generic
// `clientId` when the platform-specific one is missing, so feeding it this harmless
// placeholder keeps the screens from crashing before the real OAuth clients exist
// (Phase 0 §2f). `available` stays false (see `GOOGLE_OAUTH_CONFIGURED`), so the
// button hides and `start()` never opens a consent screen with the placeholder.
const PLACEHOLDER_CLIENT_ID = 'unconfigured.apps.googleusercontent.com';

/** Backend `/auth/google` envelope — the standard auth payload plus a new-user flag. */
type GoogleAuthResponse = AuthPayload & { isNewUser: boolean };

export type GoogleSignInOptions = {
  /** Role to create the account as, when Google returns a brand-new user. */
  role?: Extract<UserRole, 'business' | 'creator'>;
  /** Surface a user-facing error (shown inline / as a toast by the screen). */
  onError?: (message: string) => void;
};

export type GoogleSignIn = {
  /** Whether Google OAuth is configured for this build (else hide the button). */
  available: boolean;
  /** True while the consent screen is open or the backend exchange is in flight. */
  signingIn: boolean;
  /** Open the Google consent screen. No-op (with onError) if unavailable. */
  start: () => void;
};

export function useGoogleSignIn(options: GoogleSignInOptions = {}): GoogleSignIn {
  const { role, onError } = options;
  const signIn = useAuthStore((s) => s.signIn);
  const [signingIn, setSigningIn] = useState(false);

  // `useIdTokenAuthRequest` builds the request from whichever client IDs are present
  // (or the placeholder); it throws if the current platform's ID is fully undefined,
  // which is why we always pass a defined `clientId` above. Real availability is
  // gated by `GOOGLE_OAUTH_CONFIGURED` below, not by `request` being non-null.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_OAUTH.iosClientId,
    androidClientId: GOOGLE_OAUTH.androidClientId,
    webClientId: GOOGLE_OAUTH.webClientId,
    // Generic fallback the provider uses when a platform-specific ID is absent;
    // the placeholder prevents the render-time invariant throw when unconfigured.
    clientId: GOOGLE_OAUTH.webClientId ?? PLACEHOLDER_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      // `useIdTokenAuthRequest` puts the JWT in params.id_token; fall back to the
      // authentication object for safety across SDK versions.
      const idToken =
        response.params?.id_token ?? response.authentication?.idToken ?? null;
      if (!idToken) {
        setSigningIn(false);
        onError?.("Google sign-in didn't return a token. Please try again.");
        return;
      }
      void exchange(idToken);
    } else if (response.type === 'error') {
      setSigningIn(false);
      onError?.(response.error?.message ?? 'Google sign-in failed. Please try again.');
    } else {
      // 'cancel' | 'dismiss' | 'locked' — user backed out; just reset.
      setSigningIn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  async function exchange(idToken: string): Promise<void> {
    try {
      const { data } = await api.post<GoogleAuthResponse>('/auth/google', { idToken, role });
      await signIn(data);
      // No manual navigation: the root auth gate reacts to the new session.
    } catch (err) {
      onError?.(isApiError(err) ? err.message : 'Could not sign in with Google.');
    } finally {
      setSigningIn(false);
    }
  }

  const available = GOOGLE_OAUTH_CONFIGURED && Boolean(request);

  return {
    available,
    signingIn,
    start: () => {
      if (!available) {
        onError?.('Google sign-in is not available yet.');
        return;
      }
      setSigningIn(true);
      void promptAsync();
    },
  };
}
