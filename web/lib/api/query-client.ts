/**
 * Shared TanStack Query configuration + a per-request server QueryClient.
 *
 * `defaultQueryOptions` is the single source for client/server defaults (tuned for
 * an SSR app: 60s freshness, no refetch-on-focus, one retry that skips 4xx). The
 * client provider (`components/providers/query-provider.tsx`) and the server
 * prefetch helper both read it, so cache behavior matches across the boundary.
 *
 * `getServerQueryClient()` returns a request-scoped client (memoized via React
 * `cache()`) used to prefetch SSR lists, then dehydrate into a `<Hydration
 * boundary>` so the client mounts with data already in cache (no loading flash).
 */
import { cache } from 'react';
import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
  type DefaultOptions,
} from '@tanstack/react-query';
import { isApiError } from './errors';

export const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    // Retry once, but never retry a client error (4xx) — those won't fix themselves.
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
      return failureCount < 1;
    },
  },
};

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      ...defaultQueryOptions,
      dehydrate: {
        // Include pending queries so streamed SSR prefetches dehydrate too.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  });
}

/**
 * Request-scoped QueryClient for Server Components. `cache()` gives one instance
 * per request (never shared across requests, never reused between users), which
 * is exactly what SSR prefetch + dehydration needs.
 */
export const getServerQueryClient = cache(makeQueryClient);

/**
 * Browser QueryClient singleton. The client provider uses its own lazy instance;
 * this helper exists for any non-React client caller that needs the same one.
 */
let browserQueryClient: QueryClient | undefined;
export function getBrowserQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
