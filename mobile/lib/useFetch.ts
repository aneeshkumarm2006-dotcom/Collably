/**
 * Tiny data-fetching hook used by the Phase 12+ screens. Runs `fetcher` on mount
 * (and whenever `deps` change or `reload()` is called), tracking loading/error and
 * normalizing the error to a toast-safe message via `isApiError`. Keeps every
 * screen's loading → content → error → empty flow consistent without pulling in a
 * data-fetching library.
 *
 *   const { data, loading, error, reload } = useFetch(() => api.get('/x'), []);
 */
import { useCallback, useEffect, useState } from 'react';
import { isApiError } from '@/lib/api';

export type FetchResult<T> = {
  data: T | null;
  /** Replace the cached data (optimistic updates). */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  loading: boolean;
  error: string | null;
  /** Re-run the fetcher (e.g. retry button / pull-to-refresh). */
  reload: () => void;
};

export function useFetch<T>(fetcher: () => Promise<T>, deps: React.DependencyList = []): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `fetcher` is intentionally excluded — callers pass a fresh closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  return { data, setData, loading, error, reload };
}
