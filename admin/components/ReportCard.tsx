import type { Report } from '@/lib/types';
import { ReportActions } from './ReportActions';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type Status = Report['status'];

const STRIPE: Record<Status, string> = {
  open: 'bg-warn',
  dismissed: 'bg-faint',
  actioned: 'bg-good',
};

const PILL: Record<Status, { cls: string; dot: string; label: string }> = {
  open: { cls: 'bg-warn-soft text-warn', dot: 'bg-warn', label: 'Open' },
  dismissed: { cls: 'bg-elev text-muted', dot: 'bg-faint', label: 'Dismissed' },
  actioned: { cls: 'bg-good-soft text-good', dot: 'bg-good', label: 'Actioned' },
};

const TARGET_LABEL: Record<Report['targetType'], string> = {
  campaign: 'Campaign',
  business: 'Business',
  creator: 'Creator',
  user: 'User',
};

export function ReportCard({ report }: { report: Report }) {
  const status: Status =
    report.status === 'dismissed' || report.status === 'actioned' ? report.status : 'open';
  const pill = PILL[status];
  const targetType = TARGET_LABEL[report.targetType] ?? 'Item';
  const reporterName = report.reporterName?.trim() || 'Unknown reporter';

  return (
    <article className="relative overflow-hidden rounded-2xl border border-hair bg-card shadow-card">
      <span className={`absolute inset-y-0 left-0 w-1 ${STRIPE[status]}`} aria-hidden="true" />
      <div className="py-5 pl-6 pr-5">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-hair2 bg-elev px-2 py-0.5 text-[11.5px] font-bold text-muted">
                <span className="text-faint">{targetType}</span>
                <span className="text-hair">·</span>
                <span className="text-ink">{report.targetLabel || 'Unknown'}</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${pill.cls}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                {pill.label}
              </span>
            </div>
            <p className="mt-2.5 text-[15px] font-bold leading-snug text-ink">
              {report.reason?.trim() || 'No reason provided.'}
            </p>
            <p className="mt-2 truncate text-[13px] text-muted">
              <span className="font-semibold text-ink">Reported by</span> {reporterName}
              {report.reporterEmail && (
                <>
                  <span className="mx-1.5 text-faint">·</span>
                  {report.reporterEmail}
                </>
              )}
              {report.createdAt && (
                <>
                  <span className="mx-1.5 text-faint">·</span>
                  {formatDate(report.createdAt)}
                </>
              )}
            </p>
          </div>
          {status === 'open' && (
            <div className="shrink-0">
              <ReportActions id={report._id} />
            </div>
          )}
        </header>
      </div>
    </article>
  );
}
