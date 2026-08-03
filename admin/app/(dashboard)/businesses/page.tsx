import { adminGet } from '@/lib/backend';
import type { BusinessRow, Paginated } from '@/lib/types';
import { FilterTabs, type FilterCounts } from '@/components/FilterTabs';
import { BusinessCard } from '@/components/BusinessCard';
import { StatStrip } from '@/components/StatStrip';
import { PageHeader, ErrorBox, EmptyBox } from '@/components/ui';

export const dynamic = 'force-dynamic';

function queryFor(filter?: string): string {
  if (filter === 'pending') return '?verified=false&limit=50';
  if (filter === 'approved') return '?verified=true&limit=50';
  return '?limit=50';
}

function tallyCounts(list: BusinessRow[], total: number): FilterCounts {
  return {
    total,
    pending: list.filter((b) => !b.isVerified).length,
    approved: list.filter((b) => b.isVerified).length,
    rejected: 0,
  };
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

  // Primary (filtered) list — data fetch unchanged from the original page.
  let rows: BusinessRow[] = [];
  let total = 0;
  let error: string | null = null;
  try {
    const res = await adminGet<Paginated<BusinessRow>>(`/businesses${queryFor(filter)}`);
    rows = res.data;
    total = res.total;
  } catch (e) {
    error = (e as Error).message;
  }

  // Summary counts for the stat strip + tab badges. Reuse the primary fetch when
  // no filter is active; otherwise pull the full list. Degrades to a hidden strip.
  let counts: FilterCounts | null = null;
  try {
    if (!filter) {
      counts = error ? null : tallyCounts(rows, total);
    } else {
      const all = await adminGet<Paginated<BusinessRow>>('/businesses?limit=50');
      counts = tallyCounts(all.data, all.total);
    }
  } catch {
    counts = null;
  }

  return (
    <div>
      <PageHeader
        title="Businesses"
        subtitle="Review business details, then verify so they can publish campaigns."
        count={error ? undefined : (counts?.total ?? total)}
      />
      <StatStrip
        items={
          counts
            ? [
                { dot: 'bg-brand', n: counts.total, k: 'Total businesses' },
                { dot: 'bg-warn', n: counts.pending, k: 'Under review' },
                { dot: 'bg-good', n: counts.approved, k: 'Verified' },
              ]
            : null
        }
      />
      <FilterTabs base="/businesses" current={filter} counts={counts} />
      {error ? (
        <ErrorBox message={error} />
      ) : rows.length === 0 ? (
        <EmptyBox label="No businesses to show here." />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:repeat(auto-fill,minmax(460px,1fr))]">
          {rows.map((b) => (
            <BusinessCard key={b._id} business={b} />
          ))}
        </div>
      )}
    </div>
  );
}
