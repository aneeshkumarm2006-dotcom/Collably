import { cn } from '@/lib/utils';

/**
 * Brand wordmark + mark. The mark is two interlocking rounded "links" (a collab
 * glyph), re-skinned to brand-blue. Use `withWordmark={false}` for the icon only.
 */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      className={cn('h-[18px] w-[18px]', className)}
      aria-hidden
    >
      <rect x="2.4" y="8" width="11.6" height="8" rx="4" />
      <rect x="10" y="8" width="11.6" height="8" rx="4" />
    </svg>
  );
}

export interface BrandMarkProps {
  withWordmark?: boolean;
  /** Tint the wordmark for dark surfaces (footer/sidebar/hero). */
  onDark?: boolean;
  className?: string;
}

export function BrandMark({ withWordmark = true, onDark, className }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'inline-flex h-[34px] w-[34px] items-center justify-center rounded-sm',
          onDark ? 'bg-card text-ink' : 'bg-brand text-white',
        )}
      >
        <BrandGlyph />
      </span>
      {withWordmark && (
        <span
          className={cn(
            'text-[22px] font-bold tracking-tight',
            onDark ? 'text-white' : 'text-ink',
          )}
        >
          Collably
        </span>
      )}
    </span>
  );
}
