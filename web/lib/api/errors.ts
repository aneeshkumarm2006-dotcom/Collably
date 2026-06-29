/**
 * Normalized API errors. Every transport (server fetch, client fetch) throws an
 * `ApiError` on a non-2xx response, so callers (Server Components, route
 * handlers, and TanStack Query hooks alike) catch one consistent shape with a
 * render-safe `message`. The extraction logic mirrors `mobile/lib/api.ts` so the
 * web surfaces the same backend messages (including the first zod field issue).
 */

/** A normalized, render-safe API error. */
export class ApiError extends Error {
  readonly status: number;
  /** The raw parsed response body, for callers that need codes/issues. */
  readonly data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Type guard so callers can `catch (e) { if (isApiError(e)) ... }`. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/**
 * Render-safe message from any thrown value: `ApiError` (the common case from
 * the transports), a plain `Error`, else the fallback. Handy in `catch` blocks
 * that just need a string for a banner/toast.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Pull a human, render-safe string out of whatever shape the backend returned. */
function extractMessage(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const nested = (raw as { message?: unknown }).message;
    if (typeof nested === 'string') return nested;
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === 'string') return first;
      const fm = (first as { message?: unknown })?.message;
      if (typeof fm === 'string') return fm;
    }
  }
  return null;
}

/**
 * Pull the first field-level validation issue ("path: message") from either the
 * nested `{ error: { issues } }` or a flat `{ issues }` response.
 */
function firstIssueMessage(data: unknown): string | null {
  const d = data as { issues?: unknown; error?: { issues?: unknown } } | undefined;
  const issues = d?.error?.issues ?? d?.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    const first = issues[0] as { path?: unknown; message?: unknown } | string;
    if (typeof first === 'string') return first;
    if (first && typeof first.message === 'string') {
      return first.path ? `${String(first.path)}: ${first.message}` : first.message;
    }
  }
  return null;
}

/** Build an `ApiError` from a response status + parsed body. */
export function toApiError(status: number, data: unknown): ApiError {
  const message =
    firstIssueMessage(data) ??
    extractMessage((data as { error?: { message?: unknown } } | undefined)?.error?.message) ??
    extractMessage((data as { message?: unknown } | undefined)?.message) ??
    extractMessage((data as { error?: unknown } | undefined)?.error) ??
    (status === 0 ? 'Network error. Please check your connection.' : 'Something went wrong.');
  return new ApiError(status, message, data);
}
