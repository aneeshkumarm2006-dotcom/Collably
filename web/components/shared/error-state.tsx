'use client';

import { AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * ErrorState — centered icon + title + message + optional retry/home actions.
 * Used by the route-segment error boundaries (`error.tsx`) so a thrown render
 * error degrades to a recoverable panel instead of a blank screen. Mirrors the
 * visual language of `EmptyState`.
 */
export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Wired to the boundary's `reset()` — re-renders the segment. */
  onRetry?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. You can try again — if it keeps happening, please come back in a bit.',
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger [&_svg]:h-6 [&_svg]:w-6">
        <AlertTriangle aria-hidden />
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
