import type { FilterCounts } from './FilterTabs';

/**
 * Four-up summary strip: Total / Under review / Verified / Rejected, each with
 * a coloured status dot. Renders nothing if counts could not be loaded so the
 * page still works when the backend is unreachable.
 */
export function CreatorSummary({ counts }: { counts?: FilterCounts | null }) {
  if (!counts) return null;

  const items: { dot: string; n: number; k: string }[] = [
    { dot: 'bg-brand', n: counts.total, k: 'Total creators' },
    { dot: 'bg-warn', n: counts.pending, k: 'Under review' },
    { dot: 'bg-good', n: counts.approved, k: 'Verified' },
    { dot: 'bg-danger', n: counts.rejected, k: 'Rejected' },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {items.map((s) => (
        <div
          key={s.k}
          className="flex items-center gap-3.5 rounded-2xl border border-hair bg-card px-4 py-4 shadow-sm"
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
          <div>
            <div className="text-2xl font-extrabold leading-none tracking-tight tabular-nums text-ink">
              {s.n}
            </div>
            <div className="mt-1 text-[12.5px] font-semibold text-muted">{s.k}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
