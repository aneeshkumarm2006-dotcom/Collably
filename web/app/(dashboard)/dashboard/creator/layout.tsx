/**
 * Creator dashboard area (Phase 7). Layered on the `(dashboard)` group guard:
 * `requireRoleSession('creator')` resolves the session and bounces a business
 * user to their own home, then the resolved user feeds the persistent shell
 * (sidebar + top bar). Every `/dashboard/creator/*` page renders inside this.
 */
import { requireRoleSession } from '@/lib/auth/guards';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRoleSession('creator');
  return (
    <DashboardShell role="creator" user={user}>
      {children}
    </DashboardShell>
  );
}
