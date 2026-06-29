'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getBrowserQueryClient } from '@/lib/api/query-client';

/**
 * TanStack Query provider. Reuses the browser QueryClient singleton from
 * `lib/api/query-client` (so its defaults match the server prefetch client) — one
 * instance per browser session, never recreated on re-render, never shared across
 * requests on the server. Defaults (60s freshness, no refetch-on-focus, retry
 * skipping 4xx) live in `defaultQueryOptions`.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const client = getBrowserQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
