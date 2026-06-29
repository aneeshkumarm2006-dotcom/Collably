/**
 * Sanitize a `?next=` redirect target. Only same-origin app paths are honored —
 * a value must start with a single `/` (not `//`, which the browser treats as a
 * protocol-relative external URL). Anything else returns `null` so the caller
 * falls back to the role home. Guards against open-redirect via the login flow.
 */
export function sanitizeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/')) return null;
  if (next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}
