import { adminGet } from '@/lib/backend';
import type { Paginated, Report } from '@/lib/types';
import { SegmentTabs } from '@/components/SegmentTabs';
import { StatStrip } from '@/components/StatStrip';
import { ReportCard } from '@/components/ReportCard';
import { PageHeader, ErrorBox, EmptyBox } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STATUSES = ['open', 'dismissed', 'actioned'] as const;
type ReportStatus = (typeof STATUSES)[number];

function isStatus(v?: string): v is ReportStatus {
  return v === 'open' || v === 'dismissed' || v === 'actioned';
}

function queryFor(filter?: string): string {
  return isStatus(filter) ? `?status=${filter}&limit=50` : '?limit=50';
}

type Counts = { total: number; open: number; dismissed: number; actioned: number };

function tally(list: Report[], total: number): Counts {
  return {
    total,
    open: list.filter((r) => r.status === 'open').length,
    dismissed: list.filter((r) => r.status === 'dismissed').length,
    actioned: list.filter((r) => r.status === 'actioned').length,
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

  // Primary (filtered) list.
  let rows: Report[] = [];
  let total = 0;
  let error: string | null = null;
  try {
    const res = await adminGet<Paginated<Report>>(`/reports${queryFor(filter)}`);
    rows = res.data;
    total = res.total;
  } catch (e) {
    error = (e as Error).message;
  }

  // Counts for the stat strip + tab badges. Reuse the primary fetch when no
  // filter is active; otherwise pull the full list. Degrades to a hidden strip.
  let counts: Counts | null = null;
  try {
    if (!isStatus(filter)) {
      counts = error ? null : tally(rows, total);
    } else {
      const all = await adminGet<Paginated<Report>>('/reports?limit=50');
      counts = tally(all.data, all.total);
    }
  } catch {
    counts = null;
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Triage user-submitted reports, then dismiss or mark them actioned."
        count={error ? undefined : (counts?.total ?? total)}
      />
      <StatStrip
        items={
          counts
            ? [
                { dot: 'bg-warn', n: counts.open, k: 'Open' },
                { dot: 'bg-faint', n: counts.dismissed, k: 'Dismissed' },
                { dot: 'bg-good', n: counts.actioned, k: 'Actioned' },
              ]
            : null
        }
      />
      <SegmentTabs
        base="/reports"
        current={filter}
        segments={[
          { key: undefined, label: 'All', count: counts?.total },
          { key: 'open', label: 'Open', count: counts?.open },
          { key: 'dismissed', label: 'Dismissed', count: counts?.dismissed },
          { key: 'actioned', label: 'Actioned', count: counts?.actioned },
        ]}
      />
      {error ? (
        <ErrorBox message={error} />
      ) : rows.length === 0 ? (
        <EmptyBox label="No reports to show here." />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:repeat(auto-fill,minmax(460px,1fr))]">
          {rows.map((r) => (
            <ReportCard key={r._id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
