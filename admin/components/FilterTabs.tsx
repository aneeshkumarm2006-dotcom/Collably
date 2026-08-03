import Link from 'next/link';

export type FilterCounts = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type Tab = { key?: string; label: string; countKey: keyof FilterCounts };

const BASE_TABS: Tab[] = [
  { key: undefined, label: 'All', countKey: 'total' },
  { key: 'pending', label: 'Under review', countKey: 'pending' },
  { key: 'approved', label: 'Verified', countKey: 'approved' },
];

const REJECTED_TAB: Tab = { key: 'rejected', label: 'Rejected', countKey: 'rejected' };

export function FilterTabs({
  base,
  current,
  counts,
  showRejected = false,
}: {
  base: string;
  current?: string;
  counts?: FilterCounts | null;
  showRejected?: boolean;
}) {
  const tabs = showRejected ? [...BASE_TABS, REJECTED_TAB] : BASE_TABS;

  return (
    <div className="mb-6 flex gap-1 border-b border-hair" role="tablist">
      {tabs.map((t) => {
        const active = (current ?? undefined) === t.key;
        const href = t.key ? `${base}?filter=${t.key}` : base;
        const n = counts ? counts[t.countKey] : undefined;
        return (
          <Link
            key={t.label}
            href={href}
            role="tab"
            aria-selected={active}
            className={`relative px-3.5 pb-3 pt-2.5 text-[13.5px] font-bold transition after:absolute after:inset-x-2 after:-bottom-px after:h-[2.5px] after:rounded-full after:content-[''] ${
              active
                ? 'text-brand-deep after:bg-brand'
                : 'text-muted after:bg-transparent hover:text-ink'
            }`}
          >
            {t.label}
            {typeof n === 'number' && (
              <span
                className={`ml-1.5 font-semibold tabular-nums ${
                  active ? 'text-brand' : 'text-faint'
                }`}
              >
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
