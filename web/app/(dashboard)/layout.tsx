/**
 * Guard layout for the authed dashboard area. Middleware has already ensured a
 * session cookie is present; this server layout resolves the actual session and
 * enforces the richer rules — guests → `/login`, admins → the marketing site
 * (they use the separate admin app), and not-yet-onboarded users → their
 * onboarding flow. Role/area matching (creator vs business) is layered on by the
 * Phase 7/8 nested layouts via `requireRoleSession`.
 */
import { requireDashboardSession } from '@/lib/auth/guards';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardSession();
  return <>{children}</>;
}
