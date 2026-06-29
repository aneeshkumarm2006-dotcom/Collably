'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, FileText, SearchX } from 'lucide-react';

import { useApplications, useWithdrawApplication } from '@/lib/api/queries';
import { toast } from '@/lib/toast';
import { errorMessage } from '@/lib/api/errors';
import type { ApplicationStatus } from '@/lib/shared';
import type { PublicApplication } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { CreatorApplicationRow } from '@/components/creator/application-row';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmModal } from '@/components/shared/confirm-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/** Tabs per TODO Phase 7 (Cancelled/Overdue fold into "All"). */
const TABS = ['All', 'Pending', 'Accepted', 'Rejected', 'Completed', 'Withdrawn'] as const;
type Tab = (typeof TABS)[number];

export function CreatorApplicationsClient() {
  const query = useApplications({ limit: 50 });
  const withdraw = useWithdrawApplication();
  const [tab, setTab] = useState<Tab>('All');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const apps = useMemo(() => query.data?.data ?? [], [query.data]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      All: apps.length,
      Pending: 0,
      Accepted: 0,
      Rejected: 0,
      Completed: 0,
      Withdrawn: 0,
    };
    for (const a of apps) {
      if (a.status in c) c[a.status as Tab] += 1;
    }
    return c;
  }, [apps]);

  const rows = tab === 'All' ? apps : apps.filter((a) => a.status === (tab as ApplicationStatus));

  async function onWithdraw(id: string) {
    try {
      await withdraw.mutateAsync(id);
      toast.success('Application withdrawn');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not withdraw your application'));
    } finally {
      setConfirmId(null);
    }
  }

  function rowActions(app: PublicApplication): React.ReactNode {
    const canSubmit =
      (app.status === 'Accepted' || app.status === 'Overdue') && !app.submittedAt;
    const submitted =
      (app.status === 'Accepted' || app.status === 'Overdue') && Boolean(app.submittedAt);

    if (app.status === 'Pending') {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:text-danger"
          onClick={() => setConfirmId(app._id)}
        >
          Withdraw
        </Button>
      );
    }
    if (canSubmit) {
      return (
        <Button asChild size="sm">
          <Link href={`/dashboard/creator/collabs/${app._id}/submit`}>Submit content →</Link>
        </Button>
      );
    }
    if (submitted) {
      return <span className="text-[13px] font-medium text-muted">Under review</span>;
    }
    if (app.status === 'Completed' && app.submissionLink) {
      return (
        <Button asChild variant="outline" size="sm">
          <a href={app.submissionLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" /> View submission
          </a>
        </Button>
      );
    }
    return null;
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={<SearchX />}
          title="Couldn’t load your applications"
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
          description="Browse campaigns that match your niche and apply to land your first collab."
          action={
            <Button asChild>
              <Link href="/dashboard/creator/explore">Browse campaigns</Link>
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={<FileText />} title={`No ${tab.toLowerCase()} applications`} />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <CreatorApplicationRow key={a._id} application={a} actions={rowActions(a)} />
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmId !== null}
        onOpenChange={(open) => !open && setConfirmId(null)}
        title="Withdraw application?"
        description="This removes your application from the campaign. You can re-apply later while it's still open."
        confirmLabel="Withdraw"
        destructive
        loading={withdraw.isPending}
        onConfirm={() => {
          if (confirmId) void onWithdraw(confirmId);
        }}
      />
    </>
  );
}
