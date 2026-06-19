import { adminGet } from '@/lib/backend';
import type { CreatorRow, Paginated } from '@/lib/types';
import { FilterTabs } from '@/components/FilterTabs';
import { CreatorCard } from '@/components/CreatorCard';
import { PageHeader, ErrorBox, EmptyBox } from '@/components/ui';

export const dynamic = 'force-dynamic';

function queryFor(filter?: string): string {
  if (filter === 'pending') return '?verified=false&limit=50';
  if (filter === 'approved') return '?verified=true&limit=50';
  return '?limit=50';
}

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

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

  return (
    <div>
      <PageHeader
        title="Creators"
        subtitle="Review each creator's submitted social profile, then verify or revoke."
        count={error ? undefined : total}
      />
      <FilterTabs base="/creators" current={filter} />
      {error ? (
        <ErrorBox message={error} />
      ) : rows.length === 0 ? (
        <EmptyBox label="No creators to show here." />
      ) : (
        <div className="grid gap-4">
          {rows.map((c) => (
            <CreatorCard key={c._id} creator={c} />
          ))}
        </div>
      )}
    </div>
  );
}
