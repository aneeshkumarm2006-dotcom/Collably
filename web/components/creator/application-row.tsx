import Link from 'next/link';
import Image from 'next/image';

import type { PublicApplication } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { categoryEmoji, categoryGradient } from '@/lib/domain-meta';
import { formatDate } from '@/lib/format';
import { RewardPill } from '@/components/shared/reward-pill';
import { StatusBadge } from '@/components/shared/status-badge';

/**
 * A creator's application as a horizontal list row (the "My Applications" +
 * "History" screens): campaign cover + title + business + reward, with the status
 * badge, a date line, and a caller-supplied action slot on the right. Dimmed for
 * dead-end states (rejected / withdrawn / cancelled).
 */
export function CreatorApplicationRow({
  application,
  dateLabel,
  actions,
}: {
  application: PublicApplication;
  /** Overrides the default "Applied {date}" line. */
  dateLabel?: string;
  actions?: React.ReactNode;
}) {
  const campaign = application.campaign;
  const business = campaign?.business ?? application.business;
  const dimmed = ['Rejected', 'Withdrawn', 'Cancelled'].includes(application.status);
  const date = dateLabel ?? `Applied ${formatDate(application.createdAt)}`;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-lg border border-hair bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
        dimmed && 'opacity-65',
      )}
    >
      <div
        className="relative h-[60px] w-[84px] shrink-0 overflow-hidden rounded-md bg-secondary"
        style={{ background: categoryGradient(campaign?.category) }}
      >
        {campaign?.coverImage ? (
          <Image src={campaign.coverImage} alt="" fill sizes="84px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xl opacity-90">
            {categoryEmoji(campaign?.category ?? '')}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={campaign ? `/campaign/${campaign._id}` : '#'}
          className="block truncate font-semibold leading-tight text-ink hover:text-brand"
        >
          {campaign?.title ?? 'Campaign'}
        </Link>
        <p className="mt-0.5 truncate text-[13px] text-muted">{business?.businessName}</p>
        {campaign?.reward && <RewardPill reward={campaign.reward} className="mt-2" />}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={application.status} />
        <span className="text-xs text-faint">{date}</span>
        {actions && <div className="mt-1 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
