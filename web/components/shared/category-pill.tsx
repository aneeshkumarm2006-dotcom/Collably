'use client';

import { cn } from '@/lib/utils';
import { categoryEmoji } from '@/lib/domain-meta';

/**
 * CategoryPill — emoji + category name + optional count (green mono). Selectable
 * (used as a filter chip): `active` paints it brand; otherwise hover reveals the
 * brand border. Renders a <button> when `onClick` is provided, else a <span>.
 */
export interface CategoryPillProps {
  category: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CategoryPill({ category, count, active, onClick, className }: CategoryPillProps) {
  const classes = cn(
    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
    active
      ? 'border-brand bg-brand-soft text-brand'
      : 'border-hair bg-card text-muted hover:border-brand hover:text-brand',
    className,
  );

  const content = (
    <>
      <span aria-hidden>{categoryEmoji(category)}</span>
      <span>{category}</span>
      {typeof count === 'number' && (
        <span className="font-mono text-xs text-money">{count}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={classes}>
        {content}
      </button>
    );
  }
  return <span className={classes}>{content}</span>;
}
