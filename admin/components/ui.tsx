export function PageHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <header className="mb-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {typeof count === 'number' && (
          <span className="rounded-full bg-elev px-2.5 py-0.5 text-sm font-semibold text-muted">
            {count}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
      <p className="font-semibold">Could not load data from the backend.</p>
      <p className="mt-1 break-words opacity-90">{message}</p>
      <p className="mt-2 text-danger/80">
        Check that the backend is running and that <code>BACKEND_API_URL</code> /{' '}
        <code>ADMIN_API_KEY</code> are set correctly.
      </p>
    </div>
  );
}

export function EmptyBox({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-hair bg-card p-10 text-center text-sm text-muted">
      {label}
    </div>
  );
}
