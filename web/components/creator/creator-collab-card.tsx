import Link from 'next/link';
import Image from 'next/image';
import { Calendar, CheckCircle2, ExternalLink, MapPin, MessageSquare } from 'lucide-react';

import type { PublicApplication } from '@/lib/api/types';
import type { CampaignDeliverable } from '@/lib/shared';
import { cn } from '@/lib/utils';
import { categoryIcon, categoryGradient } from '@/lib/domain-meta';
import { formatDate, isOverdue } from '@/lib/format';
import { CountdownChip } from '@/components/shared/collab-card';
import { RewardPill } from '@/components/shared/reward-pill';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';

/** "1× Instagram Reel: tag @brand, 20s+" for the "what to create" checklist. */
export function deliverableLabel(d: CampaignDeliverable): string {
  const base = `${d.quantity}× ${d.platform} ${d.contentType}`;
  return d.requirements ? `${base}: ${d.requirements}` : base;
}

/** Order active collabs: action-needed (un-submitted) first, then soonest deadline. */
export function compareCollabPriority(a: PublicApplication, b: PublicApplication): number {
  const aDone = a.submittedAt ? 1 : 0;
  const bDone = b.submittedAt ? 1 : 0;
  if (aDone !== bDone) return aDone - bDone;
  const ad = a.campaign?.deadline ? +new Date(a.campaign.deadline) : Infinity;
  const bd = b.campaign?.deadline ? +new Date(b.campaign.deadline) : Infinity;
  return ad - bd;
}

/** The submission-progress label a creator cares about (not the raw status). */
function progressStatus(app: PublicApplication): string {
  if (app.status === 'Completed') return 'Completed';
  if (app.submittedAt) return 'Submitted';
  if (app.status === 'Overdue' || (app.campaign?.deadline && isOverdue(app.campaign.deadline)))
    return 'Overdue';
  return 'Not started';
}

function CollabCover({
  category,
  cover,
  className,
}: {
  category?: string;
  cover?: string | null;
  className?: string;
}) {
  const CategoryIcon = categoryIcon(category ?? '');
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-md bg-secondary', className)}
      style={{ background: categoryGradient(category) }}
    >
      {cover ? (
        <Image src={cover} alt="" fill sizes="160px" className="object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center opacity-90">
          <CategoryIcon className="h-8 w-8 text-white/85" />
        </span>
      )}
    </div>
  );
}

/**
 * A creator's accepted collaboration in flight. `compact` is the dashboard-home
 * "take action" tile; `full` adds the "what to create" deliverables checklist and
 * a "View briefing" link (the Active Collabs page). Goes red along the left edge
 * when overdue.
 */
export function CreatorCollabCard({
  application,
  variant = 'full',
}: {
  application: PublicApplication;
  variant?: 'full' | 'compact';
}) {
  const campaign = application.campaign;
  const business = campaign?.business ?? application.business;
  const status = progressStatus(application);
  const overdue = status === 'Overdue';
  const submitted = Boolean(application.submittedAt);
  const submitHref = `/dashboard/creator/collabs/${application._id}/submit`;
  const briefingHref = campaign ? `/campaign/${campaign._id}` : undefined;
  const locationText = campaign?.isRemote
    ? 'Remote'
    : [business?.location?.city].filter(Boolean).join(', ');

  const submitAction = submitted ? (
    application.submissionLink ? (
      <Button asChild variant="outline" size="sm">
        <a href={application.submissionLink} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" /> View submission
        </a>
      </Button>
    ) : (
      <span className="text-[13px] font-medium text-muted">Under review</span>
    )
  ) : (
    <Button asChild size="sm">
      <Link href={submitHref}>Submit content →</Link>
    </Button>
  );

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3.5 rounded-lg border border-hair bg-card p-3.5 shadow-sm',
          overdue && 'border-l-4 border-l-danger',
        )}
      >
        <CollabCover category={campaign?.category} cover={campaign?.coverImage} className="h-[60px] w-[84px]" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-tight text-ink">
            {campaign?.title ?? 'Campaign'}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {business?.businessName}
            {locationText ? ` · ${locationText}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {campaign?.reward && <RewardPill reward={campaign.reward} />}
            {campaign?.deadline && <CountdownChip deadline={campaign.deadline} />}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={status} />
          {submitAction}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-hair bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
        overdue && 'border-l-4 border-l-danger',
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        <CollabCover
          category={campaign?.category}
          cover={campaign?.coverImage}
          className="h-[84px] w-[120px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold leading-snug text-ink">
                {campaign?.title ?? 'Campaign'}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                <span className="font-medium text-ink">{business?.businessName}</span>
                {locationText && (
                  <>
                    <span>·</span>
                    <MapPin className="h-3.5 w-3.5" />
                    {locationText}
                  </>
                )}
              </p>
            </div>
            <StatusBadge status={status} className="shrink-0" />
          </div>
          {campaign?.reward && <RewardPill reward={campaign.reward} className="mt-3" />}
        </div>
      </div>

      {campaign?.deliverables && campaign.deliverables.length > 0 && (
        <div className="mt-4 border-t border-hair pt-4">
          <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-faint">
            What to create
          </p>
          <ul className="space-y-1.5">
            {campaign.deliverables.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted">
                <CheckCircle2
                  className={cn('mt-0.5 h-4 w-4 shrink-0', submitted ? 'text-success' : 'text-faint')}
                />
                <span>{deliverableLabel(d)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-hair pt-4">
        {campaign?.deadline && <CountdownChip deadline={campaign.deadline} />}
        {campaign?.deadline && (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
            <Calendar className="h-3.5 w-3.5" /> Deadline {formatDate(campaign.deadline)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {application.conversationId && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/creator/messages/${application.conversationId}`}>
                <MessageSquare className="h-4 w-4" /> Message
              </Link>
            </Button>
          )}
          {briefingHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={briefingHref}>View briefing</Link>
            </Button>
          )}
          {submitAction}
        </div>
      </div>
    </div>
  );
}
