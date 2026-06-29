'use client';

/**
 * Chat query hooks (Phase 9). The conversation list drives the Messages page +
 * the sidebar unread badge; the per-thread message history is a cursor-paged
 * infinite query (newest-first pages). Sending is optimistic; the real-time
 * `useDashboardRealtime` layer reuses the cache helpers exported here to fold
 * `message:new` / `conversation:read` events straight into the Query cache.
 *
 * REST is the single write path (`clientApi.conversations.*` → same-origin proxy
 * → backend); the socket only carries live deltas, exactly like mobile.
 */
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { clientApi } from '../client';
import { queryKeys } from '../query-keys';
import type {
  ConversationListResponse,
  MessagesResponse,
  PageParams,
} from '../types';
import type { Message } from '@/lib/shared';
import type { UserRole } from '@/lib/constants';

/** Cursor-paged message history: each page is newest-first; cursor = oldest createdAt. */
const PAGE_SIZE = 30;
type MessagesData = InfiniteData<MessagesResponse, string | undefined>;

/** Stable, collision-free temp id for optimistic sends (no Date/Math.random needed). */
let tempSeq = 0;

// --- Cache prefix helpers -----------------------------------------------------

/** All conversation *list* queries (any params) — for targeted invalidation. */
const listKeyPrefix = [...queryKeys.conversations.all, 'list'] as const;

// --- Queries ------------------------------------------------------------------

/** The caller's threads, newest activity first. Backs the list page + unread badge. */
export function useConversations(params?: PageParams) {
  return useQuery({
    queryKey: queryKeys.conversations.list(params),
    queryFn: ({ signal }) => clientApi.conversations.list(params, signal),
  });
}

/** One thread's metadata (other participant, campaign title). */
export function useConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(id),
    queryFn: ({ signal }) => clientApi.conversations.get(id, signal),
    enabled: Boolean(id),
  });
}

/** Cursor-paged message history for one thread (newest-first). */
export function useMessages(id: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.conversations.messages(id),
    queryFn: ({ pageParam, signal }) =>
      clientApi.conversations.messages(id, { before: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.messages.length >= PAGE_SIZE
        ? last.messages[last.messages.length - 1]?.createdAt
        : undefined,
    enabled: Boolean(id),
  });
}

// --- Mutations ----------------------------------------------------------------

/** Send a message with optimistic echo; reconciles against the server message. */
export function useSendMessage(conversationId: string, me: { id: string; role: UserRole }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => clientApi.conversations.send(conversationId, body),
    onMutate: (body) => {
      const tempId = `temp-${(tempSeq += 1)}`;
      const optimistic: Message = {
        _id: tempId,
        conversationId,
        senderUserId: me.id,
        senderRole: me.role,
        body,
        createdAt: new Date().toISOString(),
      };
      upsertMessage(qc, conversationId, optimistic);
      return { tempId };
    },
    onSuccess: (res, _body, ctx) => {
      if (ctx?.tempId) removeMessage(qc, conversationId, ctx.tempId);
      upsertMessage(qc, conversationId, res.message);
      void qc.invalidateQueries({ queryKey: listKeyPrefix });
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.tempId) removeMessage(qc, conversationId, ctx.tempId);
    },
  });
}

/** Mark a thread read for the caller (optimistically zero the unread badge). */
export function useMarkConversationRead(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clientApi.conversations.markRead(conversationId),
    onMutate: () => zeroConversationUnread(qc, conversationId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: listKeyPrefix }),
  });
}

// --- Cache mutators (shared with the socket layer) ----------------------------

/**
 * Insert a message into a thread's cached history (prepend, newest-first), or
 * replace it in place if its `_id` is already present (e.g. a `readAt` update).
 * No-op when the thread query isn't mounted — the thread refetches on open.
 */
export function upsertMessage(qc: QueryClient, conversationId: string, message: Message): void {
  qc.setQueryData<MessagesData>(queryKeys.conversations.messages(conversationId), (prev) => {
    if (!prev) return prev;
    const exists = prev.pages.some((p) => p.messages.some((m) => m._id === message._id));
    if (exists) {
      return {
        ...prev,
        pages: prev.pages.map((p) => ({
          ...p,
          messages: p.messages.map((m) => (m._id === message._id ? message : m)),
        })),
      };
    }
    const [first, ...rest] = prev.pages;
    const head: MessagesResponse = { messages: [message, ...(first?.messages ?? [])] };
    return { ...prev, pages: [head, ...rest] };
  });
}

/** Drop a message (by id) from a thread's cached history (optimistic rollback). */
export function removeMessage(qc: QueryClient, conversationId: string, id: string): void {
  qc.setQueryData<MessagesData>(queryKeys.conversations.messages(conversationId), (prev) =>
    prev
      ? {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            messages: p.messages.filter((m) => m._id !== id),
          })),
        }
      : prev,
  );
}

/** Stamp `readAt` on my outgoing messages when the other participant reads the thread. */
export function markOutgoingRead(qc: QueryClient, conversationId: string, myUserId: string): void {
  const at = new Date().toISOString();
  qc.setQueryData<MessagesData>(queryKeys.conversations.messages(conversationId), (prev) =>
    prev
      ? {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            messages: p.messages.map((m) =>
              m.senderUserId === myUserId && !m.readAt ? { ...m, readAt: at } : m,
            ),
          })),
        }
      : prev,
  );
}

/** Optimistically zero a thread's unread count across every cached list query. */
export function zeroConversationUnread(qc: QueryClient, conversationId: string): void {
  qc.setQueriesData<ConversationListResponse>({ queryKey: listKeyPrefix }, (prev) =>
    prev
      ? {
          ...prev,
          data: prev.data.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c)),
        }
      : prev,
  );
}

/** Refetch the conversation list (fresh previews + unread counts from the server). */
export function invalidateConversationList(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: listKeyPrefix });
}
