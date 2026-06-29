import { cn } from '@/lib/utils';

/**
 * StatusBadge: re-skins the reference `.badge` anatomy to the app palette.
 * Covers every campaign + application lifecycle status (plus Verified/Overdue):
 * a soft-tinted pill with a leading dot and uppercase mono label.
 */
export type StatusTone = 'success' | 'info' | 'warn' | 'danger' | 'neutral';

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-secondary text-muted',
};

/** Maps a status string (campaign or application) to a color tone. */
export const STATUS_TONE: Record<string, StatusTone> = {
  // Campaign
  Active: 'success',
  Draft: 'neutral',
  Paused: 'warn',
  Closed: 'neutral',
  Completed: 'info',
  // Application
  Pending: 'warn',
  Accepted: 'success',
  Rejected: 'danger',
  Withdrawn: 'neutral',
  Cancelled: 'neutral',
  Overdue: 'danger',
  // Submission / verification
  Verified: 'success',
  'Under review': 'warn',
  Submitted: 'info',
};

export function statusTone(status: string): StatusTone {
  return STATUS_TONE[status] ?? 'neutral';
}

export interface StatusBadgeProps {
  status: string;
  /** Override the auto-derived tone. */
  tone?: StatusTone;
  /** Hide the leading dot. */
  hideDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, tone, hideDot, className }: StatusBadgeProps) {
  const t = tone ?? statusTone(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase leading-none tracking-wide',
        TONE_CLASS[t],
        className,
      )}
    >
      {!hideDot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {status}
    </span>
  );
}
