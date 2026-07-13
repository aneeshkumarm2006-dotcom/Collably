/**
 * Google sign-in hook (PRD §7.1) — NATIVE flow via
 * `@react-native-google-signin/google-signin`.
 *
 * Why native (not the old `expo-auth-session` browser flow): the browser flow
 * opens a Chrome/Safari tab and relies on a custom-URI-scheme redirect to hand
 * control back to the app. On Android that redirect is fragile (custom-scheme
 * disabled by default on the OAuth client, and the tab often lands on google.com
 * instead of returning) → the "Access blocked / invalid_request" and "stuck on
 * Google" bugs. The native library shows the OS account picker, so there is no
 * browser and no redirect to fail.
 *
 * Flow: `start()` opens the native Google account picker → we get a Google **ID
 * token** → POST it to the backend `/auth/google` (verify signature + audience,
 * find-or-create the user) → `authStore.signIn()`. The backend contract is
 * UNCHANGED — only how the app obtains the ID token changed.
 *
 * NATIVE MODULE, LOADED LAZILY: the `@react-native-google-signin` package accesses
 * its native module at import-eval time, which throws (`RNGoogleSignin could not be
 * found`) on a JS bundle running against a binary that doesn't include it yet
 * (e.g. before a rebuild). Because the auth screens are transitively imported by
 * lots of barrels, a static import would red-screen the WHOLE app in that state.
 * So we `require()` it lazily inside `start()`, guarded — if the module is absent,
 * the button just reports "needs a rebuild" instead of crashing everything.
 * Requires a native build (dev client / EAS); does NOT run in Expo Go.
 */
import { useEffect, useState } from 'react';
import { api, isApiError } from './api';
import { GOOGLE_OAUTH, GOOGLE_OAUTH_CONFIGURED } from './env';
import { useAuthStore, type AuthPayload } from '@/store/authStore';
import type { UserRole } from '@/constants';

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let cachedModule: GoogleModule | null = null;
let moduleMissing = false;
let configured = false;

/** Lazily load the native module; returns null (once) if it isn't in the binary. */
function loadGoogle(): GoogleModule | null {
  if (cachedModule) return cachedModule;
  if (moduleMissing) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('@react-native-google-signin/google-signin') as GoogleModule;
    return cachedModule;
  } catch {
    moduleMissing = true;
    return null;
  }
}

/** Load + configure the SDK on first use. `webClientId` is the audience the backend verifies. */
function ensureConfigured(): GoogleModule | null {
  const mod = loadGoogle();
  if (mod && !configured && GOOGLE_OAUTH_CONFIGURED) {
    mod.GoogleSignin.configure({
      webClientId: GOOGLE_OAUTH.webClientId,
      iosClientId: GOOGLE_OAUTH.iosClientId,
      offlineAccess: false,
    });
    configured = true;
  }
  return mod;
}

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
  /** True while the account picker is open or the backend exchange is in flight. */
  signingIn: boolean;
  /** Open the native Google account picker. No-op (with onError) if unavailable. */
  start: () => void;
};

export function useGoogleSignIn(options: GoogleSignInOptions = {}): GoogleSignIn {
  const { role, onError } = options;
  const signIn = useAuthStore((s) => s.signIn);
  const [signingIn, setSigningIn] = useState(false);
  const [mounted, setMounted] = useState(true);
  useEffect(() => () => setMounted(false), []);

  const available = GOOGLE_OAUTH_CONFIGURED;

  async function start(): Promise<void> {
    if (!available) {
      onError?.('Google sign-in is not available yet.');
      return;
    }
    const mod = ensureConfigured();
    if (!mod) {
      onError?.('Google sign-in needs a new app build to work. Please update the app.');
      return;
    }
    const { GoogleSignin, statusCodes, isErrorWithCode } = mod;

    setSigningIn(true);
    try {
      // Android needs Play Services; on iOS this resolves immediately.
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // v13+ returns `{ type: 'success' | 'cancelled', data }`; older returns the
      // user object directly. Normalise across both shapes with one cast.
      const result = (await GoogleSignin.signIn()) as {
        type?: 'success' | 'cancelled';
        data?: { idToken?: string | null } | null;
        idToken?: string | null;
      };

      if (result?.type === 'cancelled') {
        if (mounted) setSigningIn(false);
        return;
      }

      const idToken = result?.data?.idToken ?? result?.idToken ?? null;
      if (!idToken) {
        if (mounted) setSigningIn(false);
        onError?.("Google sign-in didn't return a token. Please try again.");
        return;
      }

      const { data } = await api.post<GoogleAuthResponse>('/auth/google', { idToken, role });
      await signIn(data);
      // No manual navigation: the root auth gate reacts to the new session.
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED) {
          if (mounted) setSigningIn(false);
          return;
        }
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          onError?.('Google Play Services is required for Google sign-in.');
          if (mounted) setSigningIn(false);
          return;
        }
      }
      onError?.(isApiError(err) ? err.message : 'Could not sign in with Google.');
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
