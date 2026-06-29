import { Clock } from 'lucide-react';

import type { CampaignReward } from '@/lib/shared';
import { cn } from '@/lib/utils';
import { deadlineUrgency, formatCountdown, isOverdue, type Urgency } from '@/lib/format';
import { Avatar } from '@/components/shared/avatar';
import { RewardPill } from '@/components/shared/reward-pill';
import { StatusBadge } from '@/components/shared/status-badge';

/** Deadline countdown chip, colored by urgency (normal / warn / danger). */
const URGENCY_CLASS: Record<Urgency, string> = {
  normal: 'bg-secondary text-muted',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

export function CountdownChip({
  deadline,
  className,
}: {
  deadline: string | Date;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        URGENCY_CLASS[deadlineUrgency(deadline)],
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {formatCountdown(deadline)}
    </span>
  );
}

/**
 * CollabCard — an accepted collaboration in flight: counterparty, deliverables
 * checklist, reward, and a deadline countdown. Goes red/overdue when the
 * deadline has passed (or status is Overdue).
 */
export interface CollabCardProps {
  title: string;
  counterparty: { name: string; avatar?: string | null; role?: string };
  status?: string;
  reward?: CampaignReward;
  deadline?: string | Date;
  deliverables?: { label: string; done?: boolean }[];
  actions?: React.ReactNode;
  className?: string;
}

export function CollabCard({
  title,
  counterparty,
  status,
  reward,
  deadline,
  deliverables,
  actions,
  className,
}: CollabCardProps) {
  const overdue = status === 'Overdue' || (deadline ? isOverdue(deadline) : false);

  return (
    <div
      className={cn(
        'rounded-lg border border-hair bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
        overdue && 'border-l-4 border-l-danger bg-danger-soft',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={counterparty.name} src={counterparty.avatar} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-ink">{counterparty.name}</div>
          {counterparty.role && <div className="text-[13px] text-muted">{counterparty.role}</div>}
        </div>
        {status && <StatusBadge status={status} />}
      </div>

      <h3 className="mt-3 font-semibold leading-snug text-ink">{title}</h3>

      {deliverables && deliverables.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {deliverables.map((d, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted">
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-xs border text-[10px]',
                  d.done ? 'border-success bg-success text-white' : 'border-hair-strong',
                )}
              >
                {d.done ? '✓' : ''}
              </span>
              <span className={cn(d.done && 'line-through')}>{d.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {deadline && <CountdownChip deadline={deadline} />}
        {reward && <RewardPill reward={reward} className="ml-auto" />}
      </div>

      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
