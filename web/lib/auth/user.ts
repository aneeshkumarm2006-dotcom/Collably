/**
 * The session-user shape the UI consumes, plus the mapper from the backend's
 * `PublicUser`. Kept in a framework-neutral module (no `'use client'`, no
 * `server-only`) so both the client `AuthProvider` and the server session
 * helpers can import it without pulling in each other's runtime.
 */
import type { PublicUser } from '@/lib/shared';
import type { UserRole } from '@/lib/constants';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  /** Email verified (Google sign-in or email confirmation). */
  emailVerified: boolean;
  /** Whether the role profile (creator/business onboarding) is complete. */
  isOnboarded: boolean;
  /**
   * Admin approval of the caller's role profile — the apply/publish gate
   * (mirrors `GET /auth/me`'s `approved`). Admins are always approved; a
   * creator/business is approved once an admin verifies their profile. `false`
   * means "under review" — surface a pending state, don't hard-block browse.
   */
  approved: boolean;
}

/** Map the backend `PublicUser` (+ the `approved` flag from `/auth/me`) → `SessionUser`. */
export function toSessionUser(user: PublicUser, approved: boolean): SessionUser {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    emailVerified: user.isVerified,
    isOnboarded: user.isOnboarded,
    approved,
  };
}

/** The dashboard home for a role (admins live in the separate admin app). */
export function roleHome(role: UserRole): string {
  if (role === 'business') return '/dashboard/business';
  if (role === 'creator') return '/dashboard/creator';
  return '/';
}

/** The onboarding entry point for a role. */
export function onboardingPath(role: UserRole): string {
  return role === 'creator' ? '/onboarding/creator' : '/onboarding/business';
}

/** Where to send a user right after auth: onboarding if incomplete, else their home. */
export function postAuthPath(user: Pick<SessionUser, 'role' | 'isOnboarded'>): string {
  return user.isOnboarded ? roleHome(user.role) : onboardingPath(user.role);
}

/** Can this user apply (creator) / publish (business)? — the approval gate. */
export function canTakeGatedAction(user: Pick<SessionUser, 'role' | 'approved'>): boolean {
  if (user.role === 'admin') return true;
  return user.approved;
}
