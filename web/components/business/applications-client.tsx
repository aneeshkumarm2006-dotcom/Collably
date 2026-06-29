'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, FileText, SearchX, X } from 'lucide-react';

import { useApplications, useDecideApplication } from '@/lib/api/queries';
import { toast } from '@/lib/toast';
import { errorMessage } from '@/lib/api/errors';
import type { ApplicationStatus } from '@/lib/shared';
import type { PublicApplication } from '@/lib/api/types';
import { applicantView } from '@/lib/business/applicant';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ApplicationCard } from '@/components/shared/application-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const TABS = ['All', 'Pending', 'Accepted', 'Rejected', 'Completed'] as const;
type Tab = (typeof TABS)[number];

export function BusinessApplicationsClient({ campaignId }: { campaignId?: string }) {
  const query = useApplications({ campaignId, limit: 100 });
  const decide = useDecideApplication();
  const [tab, setTab] = useState<Tab>(campaignId ? 'Pending' : 'All');
  const [actingId, setActingId] = useState<string | null>(null);

  const apps = useMemo(() => query.data?.data ?? [], [query.data]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { All: apps.length, Pending: 0, Accepted: 0, Rejected: 0, Completed: 0 };
    for (const a of apps) if (a.status in c) c[a.status as Tab] += 1;
    return c;
  }, [apps]);

  const rows = tab === 'All' ? apps : apps.filter((a) => a.status === (tab as ApplicationStatus));

  async function onDecide(app: PublicApplication, status: 'Accepted' | 'Rejected') {
    setActingId(app._id);
    try {
      await decide.mutateAsync({ id: app._id, status });
      toast.success(
        status === 'Accepted'
          ? `Accepted ${app.creatorUser?.name ?? 'the creator'} — they can start the collab.`
          : 'Application rejected',
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the application'));
    } finally {
      setActingId(null);
    }
  }

  function rowActions(app: PublicApplication): React.ReactNode {
    const view = applicantView(app);
    const acting = actingId === app._id;
    return (
      <>
        {view.profileHref && (
          <Button asChild variant="ghost" size="sm">
            <Link href={view.profileHref} target="_blank">
              <ExternalLink className="h-4 w-4" /> Full profile
            </Link>
          </Button>
        )}
        {app.status === 'Pending' && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="text-danger hover:text-danger"
              disabled={acting}
              onClick={() => onDecide(app, 'Rejected')}
            >
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button size="sm" disabled={acting} onClick={() => onDecide(app, 'Accepted')}>
              <Check className="h-4 w-4" /> Accept
            </Button>
          </>
        )}
      </>
    );
  }

  return (
    <>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-hair">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex items-center whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === t ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {t}
            <span
              className={cn(
                'ml-2 rounded-full px-1.5 py-0.5 font-mono text-[11px] leading-none',
                tab === t ? 'bg-brand-soft text-brand' : 'bg-secondary text-muted',
              )}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={<SearchX />}
          title="Couldn’t load applications"
          description="Something went wrong. Please try again."
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : apps.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No applications yet"
          description={
            campaignId
              ? 'When creators apply to this campaign, they’ll show up here.'
              : 'Applications across all your campaigns will show up here.'
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={<FileText />} title={`No ${tab.toLowerCase()} applications`} />
      ) : (
        <div className="space-y-4">
          {rows.map((app) => {
            const view = applicantView(app);
            const appliedAt = `Applied ${formatDate(app.createdAt)}`;
            return (
              <ApplicationCard
                key={app._id}
                creator={{
                  name: view.name,
                  avatar: view.avatar,
                  handle: view.handle,
                  followers: view.followers,
                }}
                status={app.status}
                meta={
                  campaignId
                    ? appliedAt
                    : `${appliedAt}${app.campaign?.title ? ` · ${app.campaign.title}` : ''}`
                }
                pitch={app.pitch}
                portfolio={view.portfolio}
                actions={rowActions(app)}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
