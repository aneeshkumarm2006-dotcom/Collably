import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * StatCard — dashboard metric tile. Mono number (optionally money-green),
 * a rounded icon chip, and an optional up/down delta.
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  /** e.g. { value: '+12%', direction: 'up' }. */
  delta?: { value: string; direction: 'up' | 'down' };
  /** Render the value in the money/green accent (rewards $). */
  money?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon, delta, money, className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border border-hair bg-card p-[22px] shadow-sm', className)}>
      {icon && (
        <div className="mb-4 inline-flex h-[42px] w-[42px] items-center justify-center rounded-full bg-brand-soft text-brand [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </div>
      )}
      <div
        className={cn(
          'font-mono text-[32px] font-medium leading-none',
          money ? 'text-money' : 'text-ink',
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-sm text-muted">{label}</div>
      {delta && (
        <div
          className={cn(
            'mt-2.5 inline-flex items-center gap-1 text-xs font-semibold',
            delta.direction === 'up' ? 'text-success' : 'text-danger',
          )}
        >
          {delta.direction === 'up' ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {delta.value}
        </div>
      )}
    </div>
  );
}
