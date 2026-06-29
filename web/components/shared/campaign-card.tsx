import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Check, MapPin } from 'lucide-react';

import type { CampaignReward } from '@/lib/shared';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/format';
import { categoryEmoji, categoryGradient } from '@/lib/domain-meta';
import { Avatar } from '@/components/shared/avatar';
import { RewardPill } from '@/components/shared/reward-pill';

/**
 * View-model for a campaign card — a denormalized slice of `Campaign` + its
 * business, with the card-only bits (spotsLeft, applicationStatus) the API
 * computes per-viewer. Phase 6 maps `Campaign` → this; the styleguide builds it
 * directly.
 */
export interface CampaignCardData {
  id: string;
  title: string;
  category: string;
  coverImage?: string | null;
  business: { name: string; city?: string; avatar?: string | null };
  reward: CampaignReward;
  platform?: string;
  contentType?: string;
  quantity?: number;
  deadline?: string | Date;
  spotsLeft?: number;
  applicationsCount?: number;
  /** Per-viewer state painted as a corner overlay badge. */
  applicationStatus?: 'applied' | 'accepted' | 'rejected';
  closed?: boolean;
}

export interface CampaignCardProps {
  campaign: CampaignCardData;
  variant?: 'full' | 'compact';
  href?: string;
  className?: string;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-xs border border-hair px-2 py-1 font-mono text-[11px] font-medium tracking-wide">
      {children}
    </span>
  );
}

const APPLIED_OVERLAY = {
  applied: { label: '✓ Applied', className: 'bg-success text-white' },
  accepted: { label: '✓ Accepted', className: 'bg-brand text-white' },
  rejected: { label: 'Not selected', className: 'bg-muted text-white' },
} as const;

function Cover({ campaign, compact }: { campaign: CampaignCardData; compact?: boolean }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-secondary',
        compact ? 'aspect-[4/3] w-24 shrink-0 rounded-md' : 'aspect-video w-full',
      )}
      style={{ background: categoryGradient(campaign.category) }}
    >
      {campaign.coverImage ? (
        <Image
          src={campaign.coverImage}
          alt=""
          fill
          sizes={compact ? '96px' : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'}
          className={cn(
            'object-cover transition-transform duration-500 group-hover:scale-105',
            campaign.closed && 'opacity-60',
          )}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-3xl opacity-90">
          {categoryEmoji(campaign.category)}
        </span>
      )}

      {!compact && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-3">
          <span className="inline-flex items-center gap-1 rounded-xs border border-hair bg-card px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-ink">
            {categoryEmoji(campaign.category)} {campaign.category}
          </span>
          {typeof campaign.spotsLeft === 'number' && (
            <span
              className={cn(
                'rounded-xs border border-hair bg-card px-2.5 py-1 font-mono text-[11px] font-medium',
                campaign.spotsLeft <= 3 ? 'text-danger' : 'text-ink',
              )}
            >
              {campaign.spotsLeft} {campaign.spotsLeft === 1 ? 'spot' : 'spots'} left
            </span>
          )}
        </div>
      )}

      {campaign.closed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-[rgba(19,26,46,0.82)] px-4 py-2 text-[13px] font-semibold text-white">
            Campaign Closed
          </span>
        </div>
      )}
    </div>
  );
}

export function CampaignCard({ campaign, variant = 'full', href, className }: CampaignCardProps) {
  const link = href ?? `/campaign/${campaign.id}`;
  const overlay = campaign.applicationStatus
    ? APPLIED_OVERLAY[campaign.applicationStatus]
    : null;
  const shortDate = campaign.deadline ? formatDateShort(campaign.deadline) : null;

  if (variant === 'compact') {
    return (
      <Link
        href={link}
        className={cn(
          'group flex items-center gap-3.5 rounded-lg border border-hair bg-card p-3 shadow-xs transition-shadow hover:shadow-card',
          className,
        )}
      >
        <Cover campaign={campaign} compact />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <Avatar name={campaign.business.name} src={campaign.business.avatar} size={22} />
            <span className="truncate font-semibold text-ink">{campaign.business.name}</span>
          </div>
          <h3 className="truncate text-[15px] font-semibold leading-tight text-ink">
            {campaign.title}
          </h3>
          <RewardPill reward={campaign.reward} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={link}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-hair bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-hair-strong hover:shadow-card-hover',
        className,
      )}
    >
      {overlay && (
        <span
          className={cn(
            'absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-xs px-2.5 py-1 font-mono text-[11px] font-medium shadow-sm',
            overlay.className,
          )}
        >
          {overlay.label}
        </span>
      )}

      <Cover campaign={campaign} />

      <div className="flex flex-1 flex-col gap-3 p-[18px]">
        <div className="flex items-center gap-2.5">
          <Avatar name={campaign.business.name} src={campaign.business.avatar} size={30} />
          <div className="min-w-0 text-[13px] leading-tight text-muted">
            <span className="font-semibold text-ink">{campaign.business.name}</span>
            {campaign.business.city && (
              <>
                {' · '}
                <MapPin className="inline h-3 w-3 -translate-y-px" /> {campaign.business.city}
              </>
            )}
          </div>
        </div>

        <h3 className="line-clamp-2 text-[19px] font-semibold leading-snug tracking-tight text-ink">
          {campaign.title}
        </h3>

        <RewardPill reward={campaign.reward} />

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted">
          {campaign.platform && <Chip>{campaign.platform}</Chip>}
          {campaign.contentType && <Chip>{campaign.contentType}</Chip>}
          {typeof campaign.quantity === 'number' && <Chip>{campaign.quantity}×</Chip>}
          {shortDate && (
            <Chip>
              <Calendar className="h-3 w-3" />
              {shortDate}
            </Chip>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-dashed border-hair-strong pt-3 font-mono text-[11px] text-muted">
          {typeof campaign.applicationsCount === 'number' && (
            <span>
              <b className="text-ink">{campaign.applicationsCount}</b> applied
            </span>
          )}
          {typeof campaign.spotsLeft === 'number' && (
            <span className="inline-flex items-center gap-1 font-semibold text-brand">
              <Check className="h-3 w-3" />
              {campaign.spotsLeft} left
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
