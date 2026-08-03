import { adminGet } from '@/lib/backend';
import type { CreatorRow, Paginated } from '@/lib/types';
import { FilterTabs, type FilterCounts } from '@/components/FilterTabs';
import { CreatorCard } from '@/components/CreatorCard';
import { CreatorSummary } from '@/components/CreatorSummary';
import { PageHeader, ErrorBox, EmptyBox } from '@/components/ui';

export const dynamic = 'force-dynamic';

function queryFor(filter?: string): string {
  if (filter === 'pending') return '?verified=false&limit=50';
  if (filter === 'approved') return '?verified=true&limit=50';
  return '?limit=50';
}

const isRejected = (c: CreatorRow) => Boolean(c.rejectionReason) && !c.isVerified;

function tallyCounts(list: CreatorRow[], total: number): FilterCounts {
  return {
    total,
    pending: list.filter((c) => !c.isVerified && !c.rejectionReason).length,
    approved: list.filter((c) => c.isVerified).length,
    rejected: list.filter(isRejected).length,
  };
}

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

  // Primary (filtered) list — data fetch unchanged from the original page.
  let rows: CreatorRow[] = [];
  let total = 0;
  let error: string | null = null;
  try {
    const res = await adminGet<Paginated<CreatorRow>>(`/creators${queryFor(filter)}`);
    rows = res.data;
    total = res.total;
  } catch (e) {
    error = (e as Error).message;
  }

  // Summary counts for the stat strip + tab badges. When no filter is active the
  // primary fetch already returned the full list, so reuse it; otherwise pull the
  // full list separately. Degrades gracefully (hidden strip) if it fails.
  let counts: FilterCounts | null = null;
  try {
    if (!filter) {
      counts = error ? null : tallyCounts(rows, total);
    } else {
      const all = await adminGet<Paginated<CreatorRow>>('/creators?limit=50');
      counts = tallyCounts(all.data, all.total);
    }
  } catch {
    counts = null;
  }

  // View-only filtering so the tabs map to the four status buckets. The
  // "Under review" tab excludes rejected creators, and "Rejected" surfaces them.
  let display = rows;
  if (filter === 'rejected') display = rows.filter(isRejected);
  else if (filter === 'pending') display = rows.filter((c) => !c.rejectionReason);

  return (
    <div>
      <PageHeader
        title="Creators"
        subtitle="Review each creator's submitted profile, then verify, reject, or message."
        count={error ? undefined : (counts?.total ?? total)}
      />
      <CreatorSummary counts={counts} />
      <FilterTabs base="/creators" current={filter} counts={counts} showRejected />
      {error ? (
        <ErrorBox message={error} />
      ) : display.length === 0 ? (
        <EmptyBox label="No creators to show here." />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:repeat(auto-fill,minmax(460px,1fr))]">
          {display.map((c) => (
            <CreatorCard key={c._id} creator={c} />
          ))}
        </div>
      )}
    </div>
  );
}
