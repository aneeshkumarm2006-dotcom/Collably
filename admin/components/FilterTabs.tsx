import Link from 'next/link';

const TABS: { key?: string; label: string }[] = [
  { key: undefined, label: 'All' },
  { key: 'pending', label: 'Under review' },
  { key: 'approved', label: 'Verified' },
];

export function FilterTabs({ base, current }: { base: string; current?: string }) {
  return (
    <div className="mb-5 flex gap-1 border-b border-hair">
      {TABS.map((t) => {
        const active = (current ?? undefined) === t.key;
        const href = t.key ? `${base}?filter=${t.key}` : base;
        return (
          <Link
            key={t.label}
            href={href}
            className={
              active
                ? 'border-b-2 border-brand px-4 py-2.5 text-sm font-semibold text-brand'
                : 'border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink'
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
