/**
 * Business dashboard area (Phase 8). Layered on the `(dashboard)` group guard:
 * `requireRoleSession('business')` resolves the session and bounces a creator to
 * their own home, then the resolved user feeds the persistent shell (sidebar +
 * top bar). Every `/dashboard/business/*` page renders inside this.
 */
import { requireRoleSession } from '@/lib/auth/guards';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRoleSession('business');
  return (
    <DashboardShell role="business" user={user}>
      {children}
    </DashboardShell>
  );
}
