/**
 * Server-side route guards for the authed route groups. Middleware does the cheap
 * cookie-presence gate (and attaches `?next=`); these run inside the route-group
 * layouts where the resolved session is available, enforcing the richer
 * role/onboarding rules with `redirect()`.
 *
 * Approval is intentionally NOT a hard gate here: an unapproved creator/business
 * can still browse their dashboard and see "pending review" states — the
 * apply/publish actions are gated in the UI via `canTakeGatedAction`.
 */
import 'server-only';
import { redirect } from 'next/navigation';
import { getSession, type Session } from './session';
import { onboardingPath, roleHome } from './user';
import type { UserRole } from '@/lib/constants';

/**
 * Require an authenticated, onboarded session inside the `(dashboard)` group.
 * Redirects guests → `/login`, admins → the marketing site (they use the admin
 * app), and not-yet-onboarded users → their onboarding flow.
 */
export async function requireDashboardSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.user.role === 'admin') redirect('/');
  if (!session.user.isOnboarded) redirect(onboardingPath(session.user.role));
  return session;
}

/**
 * Require a session for a role-specific dashboard area (e.g. `/dashboard/creator/*`).
 * Use in the Phase 7/8 nested layouts on top of the group guard: a business
 * landing on a creator route is bounced to their own home.
 */
export async function requireRoleSession(area: Exclude<UserRole, 'admin'>): Promise<Session> {
  const session = await requireDashboardSession();
  if (session.user.role !== area) redirect(roleHome(session.user.role));
  return session;
}

/**
 * Require an authenticated session inside the `(onboarding)` group. Redirects
 * guests → `/login`, admins → the marketing site, and already-onboarded users →
 * their dashboard home (no reason to re-onboard).
 */
export async function requireOnboardingSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.user.role === 'admin') redirect('/');
  if (session.user.isOnboarded) redirect(roleHome(session.user.role));
  return session;
}
