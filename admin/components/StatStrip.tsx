export type StatItem = { dot: string; n: number; k: string };

const COLS: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

/**
 * Generic summary strip matching `CreatorSummary`: a row of stat cards, each with
 * a coloured status dot, a big number, and a label. Renders nothing when given no
 * items so a page still works when the backend is unreachable.
 */
export function StatStrip({ items }: { items?: StatItem[] | null }) {
  if (!items || items.length === 0) return null;
  const cols = COLS[items.length] ?? 'lg:grid-cols-4';

  return (
    <div className={`mb-6 grid grid-cols-2 gap-3.5 ${cols}`}>
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
