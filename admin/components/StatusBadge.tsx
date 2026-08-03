/**
 * Status dot-pill. `rejected` is optional so existing callers (the business
 * card) keep working with just `verified` / `suspended`.
 */
export function StatusBadge({
  verified,
  suspended,
  rejected,
}: {
  verified: boolean;
  suspended?: boolean;
  rejected?: boolean;
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold';

  if (suspended) {
    return (
      <span className={`${base} bg-danger-soft text-danger`}>
        <span className="h-1.5 w-1.5 rounded-full bg-danger" />
        Suspended
      </span>
    );
  }
  if (rejected) {
    return (
      <span className={`${base} bg-danger-soft text-danger`}>
        <span className="h-1.5 w-1.5 rounded-full bg-danger" />
        Rejected
      </span>
    );
  }
  return verified ? (
    <span className={`${base} bg-good-soft text-good`}>
      <span className="h-1.5 w-1.5 rounded-full bg-good" />
      Verified
    </span>
  ) : (
    <span className={`${base} bg-warn-soft text-warn`}>
      <span className="h-1.5 w-1.5 rounded-full bg-warn" />
      Under review
    </span>
  );
}
