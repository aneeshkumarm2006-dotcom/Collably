import 'server-only';

/**
 * SSR prefetch helper. Call from a Server Component to warm the request-scoped
 * QueryClient, then pass the returned dehydrated state to `<HydrationBoundary>`
 * so the matching client hooks mount with data already in cache (no loading
 * flash). Query functions here run on the server transport (`serverApi`), e.g.:
 *
 *   const state = await prefetchQueries([
 *     { queryKey: queryKeys.campaigns.list(p), queryFn: () => serverApi.campaigns.list(p) },
 *   ]);
 *   return <HydrationBoundary state={state}><ExploreClient /></HydrationBoundary>;
 */
import { dehydrate, type DehydratedState, type FetchQueryOptions } from '@tanstack/react-query';
import { getServerQueryClient } from '../query-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function prefetchQueries(queries: FetchQueryOptions<any>[]): Promise<DehydratedState> {
  const qc = getServerQueryClient();
  await Promise.all(queries.map((q) => qc.prefetchQuery(q)));
  return dehydrate(qc);
}
