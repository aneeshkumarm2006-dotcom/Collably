import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Clock,
  FileText,
  Megaphone,
  Plus,
  Upload,
} from 'lucide-react';

import { serverApi } from '@/lib/api/server';
import { getSession } from '@/lib/auth/session';
import type { BusinessProfile } from '@/lib/shared';
import { formatRelativeTime } from '@/lib/format';
import { NOTIF_CHIP_CLASS, notificationHref, notificationVisual } from '@/lib/notifications';
import { DashboardContainer, PageHeader } from '@/components/dashboard/page-shell';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Business Dashboard' };

/** Time-of-day greeting (server runtime). */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function BusinessHomePage() {
  const session = await getSession();

  const [profileRes, campaignsRes, appsRes, notifsRes] = await Promise.all([
    serverApi.profiles.getBusiness().catch(() => null),
    serverApi.campaigns.list({ mine: true, limit: 100 }).catch(() => null),
    serverApi.applications.list({ limit: 100 }).catch(() => null),
    serverApi.notifications.list({ limit: 6 }).catch(() => null),
  ]);

  const profile: BusinessProfile | null = profileRes?.profile ?? null;
  const businessName = profile?.businessName ?? session?.user.name ?? 'there';
  const campaigns = campaignsRes?.data ?? [];
  const apps = appsRes?.data ?? [];
  const notifications = notifsRes?.data ?? [];

  const activeCampaigns = campaigns.filter((c) => c.status === 'Active');
  const totalApplications = appsRes?.total ?? apps.length;
  const pending = apps.filter((a) => a.status === 'Pending');
  const toReview = apps.filter((a) => a.status === 'Accepted' && a.submittedAt);
  const completed =
    profile?.totalCollabsCompleted ?? apps.filter((a) => a.status === 'Completed').length;

  // Campaigns to manage: Active first, then most-applied, capped.
  const manageList = campaigns
    .slice()
    .sort((a, b) => {
      const aActive = a.status === 'Active' ? 1 : 0;
      const bActive = b.status === 'Active' ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return (b.applicationsCount ?? 0) - (a.applicationsCount ?? 0);
    })
    .slice(0, 5);

  const subtitle =
    pending.length > 0
      ? `You have ${pending.length} application${pending.length === 1 ? '' : 's'} waiting for a decision.`
      : "Here's what's happening with your campaigns.";

  return (
    <DashboardContainer>
      <PageHeader
        title={`${greeting()}, ${businessName}`}
        subtitle={subtitle}
        action={
          <Button asChild>
            <Link href="/dashboard/business/campaigns/new">
              <Plus className="h-4 w-4" /> New campaign
            </Link>
          </Button>
        }
      />

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active campaigns" value={activeCampaigns.length} icon={<Megaphone />} />
        <StatCard label="Total applications" value={totalApplications} icon={<FileText />} />
        <StatCard label="Pending reviews" value={pending.length} icon={<Clock />} />
        <StatCard label="Collabs completed" value={completed} icon={<BadgeCheck />} />
      </div>

      {/* Quick actions */}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/business/campaigns/new">
            <Plus className="h-4 w-4" /> Post new campaign
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/business/applications">
            <FileText className="h-4 w-4" /> Review applications
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 font-mono text-[11px] leading-none text-white">
                {pending.length}
              </span>
            )}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/business/submissions">
            <Upload className="h-4 w-4" /> Submissions to review
            {toReview.length > 0 && (
              <span className="ml-1 rounded-full bg-warn px-1.5 py-0.5 font-mono text-[11px] leading-none text-white">
                {toReview.length}
              </span>
            )}
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Active campaigns to manage */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Your campaigns</h2>
            <Link
              href="/dashboard/business/campaigns"
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              Manage all
            </Link>
          </div>
          {manageList.length === 0 ? (
            <div className="rounded-lg border border-hair bg-card">
              <EmptyState
                icon={<Megaphone />}
                title="No campaigns yet"
                description="Post your first campaign to start receiving applications from creators."
                action={
                  <Button asChild>
                    <Link href="/dashboard/business/campaigns/new">
                      <Plus className="h-4 w-4" /> Create a campaign
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="space-y-3">
              {manageList.map((c) => (
                <li
                  key={c._id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-hair bg-card p-4 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <StatusBadge status={c.status} />
                      <Link
                        href={`/dashboard/business/campaigns/${c._id}/applications`}
                        className="truncate font-semibold text-ink hover:text-brand"
                      >
                        {c.title}
                      </Link>
                    </div>
                    <p className="mt-1 font-mono text-[12px] text-muted">
                      <b className="text-ink">{c.applicationsCount}</b> application
                      {c.applicationsCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/business/campaigns/${c._id}/applications`}>
                      View applications
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-lg border border-hair bg-card p-5 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-bold text-ink">Recent activity</h2>
            <Link
              href="/dashboard/business/notifications"
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              View all
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No recent activity.</p>
          ) : (
            <ul className="divide-y divide-hair">
              {notifications.map((n) => {
                const { icon: Icon, dot } = notificationVisual(n.type);
                return (
                  <li key={n._id}>
                    <Link
                      href={notificationHref(n.deepLinkPath, 'business')}
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

          {toReview.length > 0 && (
            <Link
              href="/dashboard/business/submissions"
              className="mt-3 flex items-center justify-between rounded-md bg-warn-soft px-3.5 py-2.5 text-[13px] font-semibold text-warn transition-opacity hover:opacity-80"
            >
              <span className="inline-flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                {toReview.length} submission{toReview.length === 1 ? '' : 's'} awaiting review
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </section>
      </div>
    </DashboardContainer>
  );
}
