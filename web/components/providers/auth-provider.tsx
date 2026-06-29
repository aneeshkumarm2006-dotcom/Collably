'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@/lib/api/errors';
import type { SessionUser } from '@/lib/auth/user';

/**
 * Client auth context. The root layout is static (reads no cookies), so the
 * provider hydrates the session itself: on mount it calls `/api/auth/me` once and
 * fills in the signed-in user (guests resolve to null). `status` is `'loading'`
 * until that first probe resolves, so auth-sensitive UI can avoid flashing the
 * wrong state. An `initialUser` may still be passed (e.g. from a server component
 * that already has the session) to skip the probe and render authed immediately.
 *
 * The action methods call the same-origin `/api/auth/*` route handlers, which own
 * the cookie writes; tokens never touch this client code. Each action keeps the
 * in-memory `user` in sync and refreshes the router + TanStack cache so server
 * components and authed queries re-resolve under the new identity.
 */

// Re-export so existing consumers (`navbar`, `user-menu`, `dashboard-topbar`)
// keep importing `SessionUser` from here.
export type { SessionUser };

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'business' | 'creator';
}

interface AuthContextValue {
  user: SessionUser | null;
  status: AuthStatus;
  /** True until the initial `/api/auth/me` probe resolves. */
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Email + password sign-in. Resolves to the signed-in user. */
  login: (input: LoginInput) => Promise<SessionUser>;
  /** Create an account (role chosen up front). Resolves to the new user. */
  register: (input: RegisterInput) => Promise<SessionUser>;
  /** Verify a Google ID token. `role` is required only for brand-new accounts. */
  loginWithGoogle: (
    idToken: string,
    role?: 'business' | 'creator',
  ) => Promise<{ user: SessionUser; isNewUser: boolean }>;
  /** Complete a password reset from a token; backend auto-logs-in. Resolves to the user. */
  resetPassword: (token: string, password: string) => Promise<SessionUser>;
  /** Clear the session and reset client caches. */
  logout: () => Promise<void>;
  /** Re-fetch the session user from the server (e.g. after onboarding/approval). */
  refresh: () => Promise<SessionUser | null>;
  /** Optimistically patch the cached user (e.g. after a profile edit). */
  setUser: (user: SessionUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** POST/GET a same-origin auth route, normalizing errors to `ApiError`. */
async function authFetch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const [user, setUserState] = useState<SessionUser | null>(initialUser);
  // Skip the on-mount probe only when the server already handed us a user.
  const [status, setStatus] = useState<AuthStatus>(
    initialUser ? 'authenticated' : 'loading',
  );
  const router = useRouter();
  const queryClient = useQueryClient();

  // Commit a resolved user + the matching (non-loading) status in one go.
  const setUser = useCallback((next: SessionUser | null) => {
    setUserState(next);
    setStatus(next ? 'authenticated' : 'unauthenticated');
  }, []);

  // Hydrate the session once on mount (the static root layout reads no cookies).
  const probed = useRef(false);
  useEffect(() => {
    if (probed.current || initialUser) return;
    probed.current = true;
    let active = true;
    authFetch<{ user: SessionUser | null }>('/api/auth/me')
      .then(({ user: next }) => {
        if (active) setUser(next);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, [initialUser, setUser]);

  const login = useCallback(
    async (input: LoginInput) => {
      const { user: next } = await authFetch<{ user: SessionUser }>('/api/auth/login', input);
      setUser(next);
      await queryClient.invalidateQueries();
      router.refresh();
      return next;
    },
    [queryClient, router, setUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { user: next } = await authFetch<{ user: SessionUser }>('/api/auth/register', input);
      setUser(next);
      await queryClient.invalidateQueries();
      router.refresh();
      return next;
    },
    [queryClient, router, setUser],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string, role?: 'business' | 'creator') => {
      const result = await authFetch<{ user: SessionUser; isNewUser: boolean }>('/api/auth/google', {
        idToken,
        role,
      });
      setUser(result.user);
      await queryClient.invalidateQueries();
      router.refresh();
      return result;
    },
    [queryClient, router, setUser],
  );

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      const { user: next } = await authFetch<{ user: SessionUser }>('/api/auth/reset-password', {
        token,
        password,
      });
      setUser(next);
      await queryClient.invalidateQueries();
      router.refresh();
      return next;
    },
    [queryClient, router, setUser],
  );

  const logout = useCallback(async () => {
    try {
      await authFetch<{ ok: true }>('/api/auth/logout', {});
    } finally {
      setUser(null);
      queryClient.clear();
      router.refresh();
    }
  }, [queryClient, router, setUser]);

  const refresh = useCallback(async () => {
    const { user: next } = await authFetch<{ user: SessionUser | null }>('/api/auth/me');
    setUser(next);
    return next;
  }, [setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      login,
      register,
      loginWithGoogle,
      resetPassword,
      logout,
      refresh,
      setUser,
    }),
    [user, status, login, register, loginWithGoogle, resetPassword, logout, refresh, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
