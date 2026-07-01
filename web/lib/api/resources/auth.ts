/**
 * Auth endpoints (PRD §17) against the BACKEND contract (`/auth/*`). These return
 * the JWT pair in JSON.
 *
 * IMPORTANT: in the browser, auth must NOT be called through the generic proxy,
 * or the JWT would land in client JS. Phase 3 adds dedicated same-origin route
 * handlers (`/api/auth/*`) that call these endpoints *server-side* and stash the
 * tokens in httpOnly cookies. This resource is therefore primarily for the server
 * transport (and those Phase 3 handlers); `GET /auth/me` is the one browser-safe
 * read (it carries no token in the body).
 */
import type { HttpClient } from '../types';
import type { AuthResponse, ForgotPasswordResponse, MeResponse } from '../types';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'business' | 'creator';
}

export interface LoginInput {
  email: string;
  password: string;
}

export function createAuthApi(http: HttpClient) {
  return {
    /** POST /auth/register: create an account, return tokens. */
    register: (input: RegisterInput) => http.post<AuthResponse>('/auth/register', input),

    /** POST /auth/login: email + password → tokens. */
    login: (input: LoginInput) => http.post<AuthResponse>('/auth/login', input),

    /** POST /auth/refresh: exchange a refresh token for a fresh pair. */
    refresh: (refreshToken: string) => http.post<AuthResponse>('/auth/refresh', { refreshToken }),

    /** POST /auth/google: verify a Google ID token, find-or-create the user. */
    google: (idToken: string, role?: 'business' | 'creator') =>
      http.post<AuthResponse>('/auth/google', { idToken, role }),

    /** POST /auth/forgot-password: start a reset (always 200, anti-enumeration). */
    forgotPassword: (email: string) =>
      http.post<ForgotPasswordResponse>('/auth/forgot-password', { email }),

    /** POST /auth/reset-password: set a new password from a token (auto-login). */
    resetPassword: (token: string, password: string) =>
      http.post<AuthResponse>('/auth/reset-password', { token, password }),

    /** GET /auth/me: the authenticated user + approval flag. */
    me: (signal?: AbortSignal) => http.get<MeResponse>('/auth/me', { signal }),

    /** PATCH /auth/me: update name / avatar / notification prefs. */
    updateMe: (input: {
      name?: string;
      avatar?: string | null;
      notificationPrefs?: { push?: boolean; email?: boolean };
    }) => http.patch<{ user: AuthResponse['user'] }>('/auth/me', input),

    /** PATCH /auth/password: change password (verifies the current one). */
    changePassword: (input: { currentPassword?: string; newPassword: string }) =>
      http.patch<{ updated: true }>('/auth/password', input),

    /** PATCH /auth/email: change email (verifies password + uniqueness). */
    changeEmail: (input: { email: string; password?: string }) =>
      http.patch<{ user: AuthResponse['user'] }>('/auth/email', input),

    /** DELETE /auth/me: permanently delete the account and its data. */
    deleteAccount: (password?: string) =>
      http.delete<{ deleted: true }>('/auth/me', password ? { password } : undefined),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
