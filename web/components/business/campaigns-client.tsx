'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  CheckCircle2,
  MapPin,
  Megaphone,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  SearchX,
  Send,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';

import { useCampaigns, useSetCampaignStatus, useDeleteCampaign } from '@/lib/api/queries';
import { toast } from '@/lib/toast';
import { errorMessage } from '@/lib/api/errors';
import { CAMPAIGN_STATUS_TABS } from '@/lib/constants';
import type { CampaignStatus } from '@/lib/shared';
import { canTransitionCampaign } from '@/lib/shared';
import type { PublicCampaign } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { categoryEmoji, categoryGradient } from '@/lib/domain-meta';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmModal } from '@/components/shared/confirm-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Tab = (typeof CAMPAIGN_STATUS_TABS)[number];

const SORTS = {
  newest: 'Newest first',
  most_applied: 'Most applications',
  deadline: 'Closing soon',
} as const;
type Sort = keyof typeof SORTS;

type PendingAction = { type: 'close' | 'complete' | 'delete'; campaign: PublicCampaign };

export function BusinessCampaignsClient() {
  const query = useCampaigns({ mine: true, limit: 100 });
  const setStatus = useSetCampaignStatus();
  const remove = useDeleteCampaign();

  const [tab, setTab] = useState<Tab>('All');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [pending, setPending] = useState<PendingAction | null>(null);

  const campaigns = useMemo(() => query.data?.data ?? [], [query.data]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(CAMPAIGN_STATUS_TABS.map((t) => [t, 0])) as Record<Tab, number>;
    c.All = campaigns.length;
    for (const cam of campaigns) {
      if (cam.status in c) c[cam.status as Tab] += 1;
    }
    return c;
  }, [campaigns]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = campaigns.filter((c) => {
      if (tab !== 'All' && c.status !== tab) return false;
      if (term && !c.title.toLowerCase().includes(term)) return false;
      return true;
    });
    return filtered.slice().sort((a, b) => {
      if (sort === 'most_applied') return (b.applicationsCount ?? 0) - (a.applicationsCount ?? 0);
      if (sort === 'deadline') {
        const ad = a.deadline ? +new Date(a.deadline) : Infinity;
        const bd = b.deadline ? +new Date(b.deadline) : Infinity;
        return ad - bd;
      }
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [campaigns, tab, q, sort]);

  async function changeStatus(c: PublicCampaign, status: CampaignStatus, message: string) {
    try {
      await setStatus.mutateAsync({ id: c._id, status });
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the campaign'));
    }
  }

  async function confirmAction() {
    if (!pending) return;
    const { type, campaign } = pending;
    try {
      if (type === 'delete') {
        await remove.mutateAsync(campaign._id);
        toast.success('Campaign deleted');
      } else if (type === 'close') {
        await setStatus.mutateAsync({ id: campaign._id, status: 'Closed' });
        toast.success('Campaign closed');
      } else {
        await setStatus.mutateAsync({ id: campaign._id, status: 'Completed' });
        toast.success('Campaign marked completed');
      }
      setPending(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not complete that action'));
      setPending(null);
    }
  }

  const busy = setStatus.isPending || remove.isPending;

  return (
    <>
      {/* Tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-hair">
        {CAMPAIGN_STATUS_TABS.map((t) => (
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

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search campaigns…"
          className="max-w-xs"
        />
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="w-auto min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORTS) as Sort[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SORTS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[108px] w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={<SearchX />}
          title="Couldn’t load your campaigns"
          description="Something went wrong. Please try again."
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title="No campaigns yet"
          description="Create your first campaign to start receiving applications from creators."
          action={
            <Button asChild>
              <Link href="/dashboard/business/campaigns/new">
                <Plus className="h-4 w-4" /> New campaign
              </Link>
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={<SearchX />} title="No campaigns match" description="Try a different tab or search." />
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <CampaignRow
              key={c._id}
              campaign={c}
              busy={busy}
              onPublish={() => changeStatus(c, 'Active', 'Campaign published')}
              onPause={() => changeStatus(c, 'Paused', 'Campaign paused')}
              onResume={() => changeStatus(c, 'Active', 'Campaign resumed')}
              onClose={() => setPending({ type: 'close', campaign: c })}
              onComplete={() => setPending({ type: 'complete', campaign: c })}
              onDelete={() => setPending({ type: 'delete', campaign: c })}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.type === 'delete'
            ? 'Delete this campaign?'
            : pending?.type === 'close'
              ? 'Close this campaign?'
              : 'Mark this campaign completed?'
        }
        description={
          pending?.type === 'delete'
            ? 'This permanently removes the campaign and all of its applications. This can’t be undone.'
            : pending?.type === 'close'
              ? 'Creators won’t be able to apply anymore. Accepted collabs in progress will continue.'
              : 'This wraps up the campaign. Every accepted collab must be verified first.'
        }
        confirmLabel={
          pending?.type === 'delete' ? 'Delete' : pending?.type === 'close' ? 'Close campaign' : 'Mark completed'
        }
        destructive={pending?.type === 'delete'}
        loading={busy}
        onConfirm={confirmAction}
      />
    </>
  );
}

function CampaignRow({
  campaign: c,
  busy,
  onPublish,
  onPause,
  onResume,
  onClose,
  onComplete,
  onDelete,
}: {
  campaign: PublicCampaign;
  busy: boolean;
  onPublish: () => void;
  onPause: () => void;
  onResume: () => void;
  onClose: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const city = c.isRemote ? 'Remote' : c.location?.city;
  const canEdit = c.status !== 'Completed';
  const canClose = c.status === 'Active' || c.status === 'Paused';
  const canComplete = canTransitionCampaign(c.status, 'Completed');
  const appsHref = `/dashboard/business/campaigns/${c._id}/applications`;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-hair bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={appsHref}
        className="relative h-[64px] w-[92px] shrink-0 overflow-hidden rounded-md bg-secondary"
        style={{ background: categoryGradient(c.category) }}
      >
        {c.coverImage ? (
          <Image src={c.coverImage} alt="" fill sizes="92px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xl opacity-90">
            {categoryEmoji(c.category)}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <Link href={appsHref} className="truncate font-semibold text-ink hover:text-brand">
            {c.title}
          </Link>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-muted">
          <span className="inline-flex items-center gap-1">
            {categoryEmoji(c.category)} {c.category}
          </span>
          {city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {city}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            <b className="text-ink">{c.applicationsCount}</b> applied
          </span>
          {c.deadline && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {formatDate(c.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={appsHref}>
            <Users className="h-4 w-4" /> Applications ({c.applicationsCount})
          </Link>
        </Button>
        {canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/business/campaigns/${c._id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions" disabled={busy}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {c.status === 'Draft' && (
              <DropdownMenuItem onClick={onPublish}>
                <Send className="h-4 w-4" /> Publish
              </DropdownMenuItem>
            )}
            {c.status === 'Active' && (
              <DropdownMenuItem onClick={onPause}>
                <Pause className="h-4 w-4" /> Pause
              </DropdownMenuItem>
            )}
            {c.status === 'Paused' && (
              <DropdownMenuItem onClick={onResume}>
                <Play className="h-4 w-4" /> Resume
              </DropdownMenuItem>
            )}
            {canClose && (
              <DropdownMenuItem onClick={onClose}>
                <XCircle className="h-4 w-4" /> Close
              </DropdownMenuItem>
            )}
            {canComplete && (
              <DropdownMenuItem onClick={onComplete}>
                <CheckCircle2 className="h-4 w-4" /> Mark completed
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-danger focus:text-danger">
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
