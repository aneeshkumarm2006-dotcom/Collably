import { cn } from '@/lib/utils';

/**
 * EmptyState — centered icon + title + description + optional action. Used
 * wherever a list/grid/query returns nothing (explore, applications, etc.).
 */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-faint [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
