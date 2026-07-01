/**
 * The shared `fetch` core behind both transports. `createHttpClient` builds an
 * `HttpClient` given a base URL and a header resolver; the server transport
 * supplies the access-cookie Bearer header + `no-store`, the client transport
 * points at the same-origin proxy. Centralizing JSON encode/decode + error
 * normalization here means the two transports can't drift.
 */
import { toApiError } from './errors';
import type { HttpClient, QueryParams, RequestOptions } from './types';

/** Serialize query params into a `?a=1&b=x,y` string (arrays → CSV, drop nullish). */
export function buildQuery(query?: QueryParams): string {
  if (!query) return '';
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) sp.set(key, value.join(','));
    } else {
      sp.set(key, String(value));
    }
  }
  // Note: object values aren't expected here; they'd stringify to "[object Object]".
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/** Read + parse a response body as JSON (tolerates empty 204-style bodies). */
async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Non-JSON body (shouldn't happen for the API, but don't crash on it).
    return text;
  }
}

export interface HttpClientConfig {
  /** Base URL or path prepended to every request path (no trailing slash). */
  baseUrl: string;
  /** Resolve per-request headers (e.g. cookie → Bearer). Called on every call. */
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  /** Default cache mode (server → `no-store`). */
  defaultCache?: RequestCache;
  /** Default Next.js fetch cache hints (public transport → an ISR `revalidate` window). */
  defaultNext?: { revalidate?: number | false; tags?: string[] };
}

export function createHttpClient(clientConfig: HttpClientConfig): HttpClient {
  const { baseUrl, getHeaders, defaultCache, defaultNext } = clientConfig;

  async function request<T>(
    method: string,
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = `${baseUrl}${path}${buildQuery(options?.query)}`;
    const headers = new Headers(getHeaders ? await getHeaders() : undefined);
    if (options?.headers) {
      new Headers(options.headers).forEach((v, k) => headers.set(k, v));
    }
    const hasBody = body !== undefined && body !== null;
    if (hasBody) headers.set('content-type', 'application/json');

    // `cache` and `next.revalidate` are mutually exclusive in Next's fetch, so only
    // pass `next` when we're not forcing a `cache` mode (and vice-versa).
    const cacheMode = options?.cache ?? (options?.next || defaultNext ? undefined : defaultCache);
    const nextHint = options?.next ?? (cacheMode ? undefined : defaultNext);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(body) : undefined,
        ...(cacheMode ? { cache: cacheMode } : {}),
        ...(nextHint ? { next: nextHint } : {}),
        signal: options?.signal,
      });
    } catch (err) {
      // Network/abort failure: surface as a status-0 ApiError (preserves aborts).
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw toApiError(0, { message: (err as Error)?.message });
    }

    const data = await parseBody(res);
    if (!res.ok) throw toApiError(res.status, data);
    return data as T;
  }

  return {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
    put: (path, body, options) => request('PUT', path, body, options),
    patch: (path, body, options) => request('PATCH', path, body, options),
    delete: (path, body, options) => request('DELETE', path, body, options),
  };
}
