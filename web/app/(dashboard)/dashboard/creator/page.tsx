import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, BadgeCheck, Compass, FileText, Gift, Handshake, Zap } from 'lucide-react';

import { serverApi } from '@/lib/api/server';
import { getSession } from '@/lib/auth/session';
import type { CreatorProfile } from '@/lib/shared';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { creatorProfileCompletion } from '@/lib/creator/profile-completion';
import { NOTIF_CHIP_CLASS, notificationHref, notificationVisual } from '@/lib/notifications';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { CreatorCollabCard, compareCollabPriority } from '@/components/creator/creator-collab-card';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Creator Dashboard' };

export default async function CreatorHomePage() {
  const session = await getSession();
  const firstName = session?.user.name?.split(/\s+/)[0] ?? 'there';

  const [profileRes, appsRes, notifsRes] = await Promise.all([
    serverApi.profiles.getCreator().catch(() => null),
    serverApi.applications.list({ limit: 50 }).catch(() => null),
    serverApi.notifications.list({ limit: 5 }).catch(() => null),
  ]);

  const profile: CreatorProfile | null = profileRes?.profile ?? null;
  const apps = appsRes?.data ?? [];
  const notifications = notifsRes?.data ?? [];

  const pending = apps.filter((a) => a.status === 'Pending');
  const activeCollabs = apps
    .filter((a) => a.status === 'Accepted' || a.status === 'Overdue')
    .sort(compareCollabPriority);
  const needsAction = activeCollabs.filter((a) => !a.submittedAt).length;

  const completedCount = profile?.totalCollabsCompleted ?? apps.filter((a) => a.status === 'Completed').length;
  const rewards =
    profile?.totalRewardsEarned ??
    apps
      .filter((a) => a.status === 'Completed')
      .reduce((sum, a) => sum + (a.campaign?.reward.estimatedValue ?? 0), 0);

  const completion = profile ? creatorProfileCompletion(profile) : null;

  const subtitle =
    needsAction > 0
      ? `You have ${needsAction} active ${needsAction === 1 ? 'collab' : 'collabs'} that ${needsAction === 1 ? 'needs' : 'need'} your attention.`
      : 'Browse new campaigns and land your next collab.';

  return (
    <DashboardContainer>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={subtitle}
        action={
          <Button asChild>
            <Link href="/dashboard/creator/explore">
              <Compass className="h-4 w-4" /> Browse campaigns
            </Link>
          </Button>
        }
      />

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active applications" value={pending.length} icon={<FileText />} />
        <StatCard label="Accepted collabs" value={activeCollabs.length} icon={<Handshake />} />
        <StatCard label="Completed collabs" value={completedCount} icon={<BadgeCheck />} />
        <StatCard label="Rewards earned" value={formatCurrency(rewards)} icon={<Gift />} money />
      </div>

      {/* Profile completion */}
      {completion && completion.percent < 100 && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-warn/30 bg-warn-soft p-5">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
            <Zap className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Complete your profile to get more collab opportunities</p>
            <p className="mt-0.5 text-[13px] text-muted">
              Creators with full profiles get 3× more acceptances.
              {completion.missing.length > 0 && ` Next: ${completion.missing[0]}.`}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={completion.percent} className="max-w-xs" />
              <span className="font-mono text-[13px] font-semibold text-ink">{completion.percent}%</span>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/dashboard/creator/profile">
              Complete profile <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Active collabs: take action */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Active collabs: take action</h2>
            <Link
              href="/dashboard/creator/collabs"
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              View all
            </Link>
          </div>
          {activeCollabs.length === 0 ? (
            <div className="rounded-lg border border-hair bg-card">
              <EmptyState
                icon={<Handshake />}
                title="No active collabs yet"
                description="Apply to campaigns that match your niche, and accepted collabs show up here."
                action={
                  <Button asChild variant="outline">
                    <Link href="/dashboard/creator/explore">Browse campaigns</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {activeCollabs.slice(0, 3).map((a) => (
                <CreatorCollabCard key={a._id} application={a} variant="compact" />
              ))}
            </div>
          )}
        </section>

        {/* Side column: pending applications + recent notifications */}
        <div className="space-y-6">
          <section className="rounded-lg border border-hair bg-card p-5 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-bold text-ink">Pending applications</h2>
              <Link
                href="/dashboard/creator/applications"
                className="text-[13px] font-semibold text-brand hover:underline"
              >
                View all
              </Link>
            </div>
            {pending.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No pending applications.</p>
            ) : (
              <ul className="divide-y divide-hair">
                {pending.slice(0, 4).map((a) => (
                  <li key={a._id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/campaign/${a.campaignId}`}
                        className="block truncate text-sm font-semibold text-ink hover:text-brand"
                      >
                        {a.campaign?.title ?? 'Campaign'}
                      </Link>
                      <p className="truncate text-xs text-muted">{a.campaign?.business?.businessName}</p>
                    </div>
                    <StatusBadge status={a.status} className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-hair bg-card p-5 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-bold text-ink">Recent notifications</h2>
              <Link
                href="/dashboard/creator/notifications"
                className="text-[13px] font-semibold text-brand hover:underline"
              >
                View all
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-hair">
                {notifications.map((n) => {
                  const { icon: Icon, dot } = notificationVisual(n.type);
                  return (
                    <li key={n._id}>
                      <Link
                        href={notificationHref(n.deepLinkPath, 'creator')}
                        className="flex items-start gap-3 py-3 transition-colors hover:opacity-80"
                      >
                        <span
                          className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${NOTIF_CHIP_CLASS[dot]} [&_svg]:h-3.5 [&_svg]:w-3.5`}
                        >
                          <Icon />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-snug text-ink">{n.message}</p>
                          <p className="mt-0.5 text-[11px] text-faint">{formatRelativeTime(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-info" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </DashboardContainer>
  );
}
