import Link from 'next/link';

export type Segment = { key?: string; label: string; count?: number };

/**
 * Accent-underline tab bar (same look as `FilterTabs`) driven by an arbitrary set
 * of segments, so pages with non-creator status buckets (reports, etc.) can share
 * the styling. The active segment is matched against `current`.
 */
export function SegmentTabs({
  base,
  current,
  segments,
}: {
  base: string;
  current?: string;
  segments: Segment[];
}) {
  return (
    <div className="mb-6 flex gap-1 border-b border-hair" role="tablist">
      {segments.map((s) => {
        const active = (current ?? undefined) === s.key;
        const href = s.key ? `${base}?filter=${s.key}` : base;
        return (
          <Link
            key={s.label}
            href={href}
            role="tab"
            aria-selected={active}
            className={`relative px-3.5 pb-3 pt-2.5 text-[13.5px] font-bold transition after:absolute after:inset-x-2 after:-bottom-px after:h-[2.5px] after:rounded-full after:content-[''] ${
              active
                ? 'text-brand-deep after:bg-brand'
                : 'text-muted after:bg-transparent hover:text-ink'
            }`}
          >
            {s.label}
            {typeof s.count === 'number' && (
              <span
                className={`ml-1.5 font-semibold tabular-nums ${
                  active ? 'text-brand' : 'text-faint'
                }`}
              >
                {s.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
