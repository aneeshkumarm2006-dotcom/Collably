'use client';

/**
 * Notification query hooks driving the `NotificationBell` + full feed (Phase 10).
 * The list carries the unread count; "mark all read" optimistically zeroes it and
 * refetches. Both hooks opt into refetch-on-window-focus (the global default is
 * off) so returning to the tab surfaces anything that arrived while away, and the
 * realtime layer (`useDashboardRealtime`) calls `invalidateNotifications` to fold
 * in `notification:new` socket deltas live.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { clientApi } from '../client';
import { queryKeys } from '../query-keys';
import type { NotificationListParams } from '../resources';
import type { NotificationListResponse } from '../types';

export function useNotifications(params?: NotificationListParams) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: ({ signal }) => clientApi.notifications.list(params, signal),
    refetchOnWindowFocus: true,
  });
}

/** Infinite list for the full notifications page (newest-first, paged). */
export function useInfiniteNotifications(params?: Omit<NotificationListParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: ({ pageParam, signal }) =>
      clientApi.notifications.list({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    refetchOnWindowFocus: true,
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clientApi.notifications.markAllRead(),
    // Optimistically flip every cached notification to read + zero the unread
    // count so the bell badge clears instantly; snapshot for rollback on error.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications.all });
      const snapshot = qc.getQueriesData({ queryKey: queryKeys.notifications.all });
      for (const [key, value] of snapshot) {
        qc.setQueryData(key, markCachedRead(value));
      }
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, value]) => qc.setQueryData(key, value));
    },
    onSettled: () => invalidateNotifications(qc),
  });
}

/**
 * Mark every notification read in a cached query value — handles both the plain
 * list (`useNotifications`) and the infinite feed (`{ pages: [...] }`). Returns a
 * new object so React Query treats it as changed; unknown shapes pass through.
 */
function markCachedRead(value: unknown): unknown {
  const readPage = (page: NotificationListResponse): NotificationListResponse => ({
    ...page,
    unreadCount: 0,
    data: page.data.map((n) => (n.isRead ? n : { ...n, isRead: true })),
  });
  if (value && typeof value === 'object') {
    if ('pages' in value) {
      const infinite = value as { pages: NotificationListResponse[] };
      return { ...infinite, pages: infinite.pages.map(readPage) };
    }
    if ('data' in value && 'unreadCount' in value) {
      return readPage(value as NotificationListResponse);
    }
  }
  return value;
}

/**
 * Refetch every notification query (bell + full feed) so the unread count and
 * the list reconcile against the server. Shared with the realtime layer, which
 * calls this on a `notification:new` socket event — the server stays the source
 * of truth for the unread count rather than us guessing it client-side.
 */
export function invalidateNotifications(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
}
