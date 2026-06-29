import Image from 'next/image';

import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/format';
import { Avatar } from '@/components/shared/avatar';
import { StatusBadge, statusTone } from '@/components/shared/status-badge';

/**
 * ApplicationCard — a creator's application as seen by a business: identity +
 * pitch + portfolio + decision actions. A left accent border reflects the
 * decision (accepted = green, rejected = red + dimmed).
 */
export interface ApplicationCardProps {
  creator: { name: string; handle?: string; avatar?: string | null; followers?: number };
  status: string;
  /** e.g. "Applied 2 days ago · Spring Tasting Menu". */
  meta?: string;
  pitch?: string;
  portfolio?: string[];
  date?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function ApplicationCard({
  creator,
  status,
  meta,
  pitch,
  portfolio,
  date,
  actions,
  className,
}: ApplicationCardProps) {
  const tone = statusTone(status);
  const accent =
    tone === 'success'
      ? 'border-l-success'
      : tone === 'danger'
        ? 'border-l-danger'
        : 'border-l-hair';

  return (
    <div
      className={cn(
        'rounded-lg border border-hair border-l-4 bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
        accent,
        status === 'Rejected' && 'opacity-65',
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={creator.name} src={creator.avatar} size={54} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-ink">{creator.name}</h3>
          {(creator.handle || typeof creator.followers === 'number') && (
            <div className="text-[13px] text-muted">
              {creator.handle && <span>{creator.handle}</span>}
              {typeof creator.followers === 'number' && (
                <span className="font-mono text-ink">
                  {creator.handle ? ' · ' : ''}
                  {formatCompactNumber(creator.followers)} followers
                </span>
              )}
            </div>
          )}
          {meta && <div className="mt-0.5 text-[13px] text-muted">{meta}</div>}
        </div>
        <StatusBadge status={status} className="shrink-0" />
      </div>

      {pitch && (
        <blockquote className="mt-3 rounded-md bg-secondary px-3.5 py-3 text-sm italic leading-relaxed text-muted">
          “{pitch}”
        </blockquote>
      )}

      {portfolio && portfolio.length > 0 && (
        <div className="mt-3 flex gap-2">
          {portfolio.slice(0, 5).map((src, i) => (
            <Image
              key={i}
              src={src}
              alt=""
              width={64}
              height={48}
              className="h-12 w-16 rounded-sm object-cover"
            />
          ))}
        </div>
      )}

      {(date || actions) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {date && <span className="text-xs text-faint">{date}</span>}
          {actions && <div className="ml-auto flex gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}
