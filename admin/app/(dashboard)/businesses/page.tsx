import { adminGet } from '@/lib/backend';
import type { BusinessRow, Paginated } from '@/lib/types';
import { FilterTabs } from '@/components/FilterTabs';
import { BusinessCard } from '@/components/BusinessCard';
import { PageHeader, ErrorBox, EmptyBox } from '@/components/ui';

export const dynamic = 'force-dynamic';

function queryFor(filter?: string): string {
  if (filter === 'pending') return '?verified=false&limit=50';
  if (filter === 'approved') return '?verified=true&limit=50';
  return '?limit=50';
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

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

  return (
    <div>
      <PageHeader
        title="Businesses"
        subtitle="Review business details, then verify so they can publish campaigns."
        count={error ? undefined : total}
      />
      <FilterTabs base="/businesses" current={filter} />
      {error ? (
        <ErrorBox message={error} />
      ) : rows.length === 0 ? (
        <EmptyBox label="No businesses to show here." />
      ) : (
        <div className="grid gap-4">
          {rows.map((b) => (
            <BusinessCard key={b._id} business={b} />
          ))}
        </div>
      )}
    </div>
  );
}
