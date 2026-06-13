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
import { loadTokens, setTokens, clearTokens, forceSignOut, onSignOut } from '@/lib/auth';

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
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  role: null,
  isGuest: false,

  hydrate: async () => {
    const { accessToken } = await loadTokens();
    if (!accessToken) {
      set({ status: 'unauthenticated', user: null, role: null });
      return;
    }
    try {
      // Token present — validate it and load the current user.
      const { data } = await api.get<{ user: PublicUser }>('/auth/me');
      set({ status: 'authenticated', user: data.user, role: data.user.role, isGuest: false });
    } catch {
      // Token invalid/expired beyond refresh — start clean.
      await clearTokens();
      set({ status: 'unauthenticated', user: null, role: null });
    }
  },

  signIn: async (payload) => {
    await setTokens({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });
    set({
      status: 'authenticated',
      user: payload.user,
      role: payload.user.role,
      isGuest: false,
    });
  },

  signOut: async () => {
    // forceSignOut clears tokens AND fires onSignOut listeners (incl. ours below).
    await forceSignOut();
  },

  continueAsGuest: () => set({ status: 'guest', isGuest: true, user: null, role: null }),

  setUser: (user) => set({ user, role: user.role }),
}));

// When the session is invalidated anywhere (failed refresh in lib/api, or an
// explicit signOut), reset the store to logged-out exactly once.
onSignOut(() => {
  useAuthStore.setState({
    status: 'unauthenticated',
    user: null,
    role: null,
    isGuest: false,
  });
});
