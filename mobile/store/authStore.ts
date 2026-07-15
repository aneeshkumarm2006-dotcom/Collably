/**
 * Auth store (Zustand). Single source of truth for the current session in the UI:
 * the logged-in user, their role, and a guest flag for browse-without-login mode
 * (PRD §8.6). Token persistence lives in `lib/auth` (SecureStore); this store only
 * mirrors the user object for rendering and orchestrates sign-in/out.
 *
 * Lifecycle:
 *   - `hydrate()` runs once at app boot (root `_layout`): restores tokens from
 *     SecureStore and, if present, re-fetches the user via `GET /auth/me`.
 *   - `signIn()` is called by the login/register screens with the backend's auth
 *     response. `signOut()` clears everything. `continueAsGuest()` enters PRD §8.6.
 *   - It subscribes to `onSignOut` so a failed token refresh (in `lib/api`) also
 *     resets the UI to logged-out.
 */
import { create } from 'zustand';
import type { PublicUser } from '@/types';
import type { UserRole } from '@/constants';
import { api } from '@/lib/api';
import {
  loadTokens,
  setTokens,
  forceSignOut,
  onSignOut,
  loadHasAuthedBefore,
  markAuthedBefore,
  loadUser,
  saveUser,
  getAccessToken,
} from '@/lib/auth';
import { useNotificationStore } from '@/store/notificationStore';
import { useCelebrationStore } from '@/store/celebrationStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useIntroStore } from '@/store/introStore';

/** Coarse auth state used to gate navigation in the root layout. */
export type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'unauthenticated';

/** Backend auth success envelope (see backend `authResponse`). */
export type AuthPayload = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  status: AuthStatus;
  user: PublicUser | null;
  role: UserRole | null;
  isGuest: boolean;
  /**
   * Admin approval of the caller's role profile (the apply/publish gate). Mirrors
   * the backend's `GET /auth/me` `approved`: admins are always approved; a
   * creator/business is approved once an admin verifies their profile. `false`
   * means "under review". Server-side checks remain authoritative; this just lets
   * the UI gate proactively.
   */
  approved: boolean;
  /**
   * True once this device has signed in at least once. Survives logout, so the gate
   * can send a returning-but-logged-out user to Sign in instead of the new-user
   * Welcome. Loaded at boot from SecureStore.
   */
  hasAuthedBefore: boolean;
  /** Restore session from SecureStore on app start. */
  hydrate: () => Promise<void>;
  /** Persist tokens + set the user after login/register/Google. */
  signIn: (payload: AuthPayload) => Promise<void>;
  /** Clear tokens + reset to logged-out. */
  signOut: () => Promise<void>;
  /** Enter guest mode (browse without an account). */
  continueAsGuest: () => void;
  /** Patch the cached user (e.g. after editing profile / onboarding). */
  setUser: (user: PublicUser) => void;
  /** Update the cached approval flag (e.g. after the profile screen reloads it). */
  setApproved: (approved: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  role: null,
  isGuest: false,
  approved: false,
  hasAuthedBefore: false,

  hydrate: async () => {
    const [{ accessToken }, authedBefore, cachedUser] = await Promise.all([
      loadTokens(),
      loadHasAuthedBefore(),
      loadUser(),
    ]);
    set({ hasAuthedBefore: authedBefore });

    if (!accessToken) {
      set({ status: 'unauthenticated', user: null, role: null, approved: false });
      return;
    }

    // Optimistic restore: a stored token + cached user means "logged in". Show it
    // immediately so a transient boot error (offline, server blip) can never strand
    // a genuinely-logged-in user on the login screen. The token is re-validated in
    // the background just below.
    if (cachedUser) {
      if (!authedBefore) void markAuthedBefore();
      set({
        status: 'authenticated',
        user: cachedUser,
        role: cachedUser.role,
        isGuest: false,
        hasAuthedBefore: true,
        approved: cachedUser.role === 'admin',
      });
    }

    try {
      // Validate the token and refresh the cached user + approval flag.
      const { data } = await api.get<{ user: PublicUser; approved?: boolean }>('/auth/me');
      if (!authedBefore) void markAuthedBefore();
      void saveUser(data.user);
      set({
        status: 'authenticated',
        user: data.user,
        role: data.user.role,
        isGuest: false,
        hasAuthedBefore: true,
        approved: Boolean(data.approved),
      });
    } catch {
      // A genuine 401 whose refresh also failed already ran forceSignOut (tokens
      // cleared, store reset via onSignOut) — detectable because the in-memory token
      // is now null. Anything else is transient (offline, timeout, 5xx): keep the
      // session rather than logging the user out for a network hiccup.
      if (getAccessToken() === null) {
        set({ status: 'unauthenticated', user: null, role: null, approved: false });
      } else if (!cachedUser) {
        // Token still valid but no cache to show and /auth/me didn't answer. Don't
        // wipe the token — surface login for now and recover on the next good boot.
        set({ status: 'unauthenticated', user: null, role: null, approved: false });
      }
      // else: keep the optimistic authenticated session from the cache.
    }
  },

  signIn: async (payload) => {
    await setTokens({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });
    // Cache the user for optimistic restore, and mark the device as "has signed in"
    // (persists across a later logout so the gate routes to Sign in, not Welcome).
    void saveUser(payload.user);
    void markAuthedBefore();
    set({
      status: 'authenticated',
      user: payload.user,
      role: payload.user.role,
      isGuest: false,
      hasAuthedBefore: true,
      // Admins are always approved; otherwise default to false until /auth/me resolves.
      approved: payload.user.role === 'admin',
    });
    // Resolve the real approval flag in the background (the login/register response
    // doesn't carry it). Non-blocking so navigation isn't delayed.
    void api
      .get<{ approved?: boolean }>('/auth/me')
      .then(({ data }) => set({ approved: Boolean(data.approved) }))
      .catch(() => {
        /* leave the optimistic default; server checks still gate any action */
      });
  },

  signOut: async () => {
    // forceSignOut clears tokens AND fires onSignOut listeners (incl. ours below).
    await forceSignOut();
  },

  continueAsGuest: () =>
    set({ status: 'guest', isGuest: true, user: null, role: null, approved: false }),

  setUser: (user) => {
    // Keep the boot cache in step with profile/onboarding edits.
    void saveUser(user);
    set({ user, role: user.role });
  },

  setApproved: (approved) => set({ approved }),
}));

// When the session is invalidated anywhere (failed refresh in lib/api, or an
// explicit signOut), reset the store to logged-out exactly once. Also clear the
// other user-scoped stores so nothing from user A (unread bell badge, a pending
// "Hurray" popup) bleeds into user B's session. (Chat is reset by useChatSocket.)
onSignOut(() => {
  useAuthStore.setState({
    status: 'unauthenticated',
    user: null,
    role: null,
    isGuest: false,
    approved: false,
  });
  useNotificationStore.getState().clear();
  useCelebrationStore.getState().dismiss();
  useFavoritesStore.getState().clear();
  useIntroStore.getState().reset();
});
