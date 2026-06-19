export function StatusBadge({ verified, suspended }: { verified: boolean; suspended?: boolean }) {
  if (suspended) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
        <span className="h-1.5 w-1.5 rounded-full bg-danger" />
        Suspended
      </span>
    );
  }
  return verified ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">
      <span className="h-1.5 w-1.5 rounded-full bg-warn" />
      Under review
    </span>
  );
}
