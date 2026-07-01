/**
 * Chat endpoints (PRD §9): the conversation list, message history (cursor
 * paginated), send, and mark-read. Real-time delivery is layered on in Phase 9
 * via Socket.io; these are the REST reads/writes. Maps 1:1 to
 * `backend/src/routes/conversations.ts`.
 */
import type { HttpClient } from '../types';
import type {
  ConversationListResponse,
  ConversationResponse,
  MessageHistoryParams,
  MessageResponse,
  MessagesResponse,
  PageParams,
} from '../types';

export function createConversationsApi(http: HttpClient) {
  return {
    /** GET /conversations: the caller's threads, newest activity first. */
    list: (params?: PageParams, signal?: AbortSignal) =>
      http.get<ConversationListResponse>('/conversations', {
        query: params as Record<string, unknown>,
        signal,
      }),

    /** GET /conversations/:id: one thread (participant only). */
    get: (id: string, signal?: AbortSignal) =>
      http.get<ConversationResponse>(`/conversations/${id}`, { signal }),

    /** GET /conversations/:id/messages: newest-first cursor history. */
    messages: (id: string, params?: MessageHistoryParams, signal?: AbortSignal) =>
      http.get<MessagesResponse>(`/conversations/${id}/messages`, {
        query: params as Record<string, unknown>,
        signal,
      }),

    /** POST /conversations/:id/messages: send a message. */
    send: (id: string, body: string) =>
      http.post<MessageResponse>(`/conversations/${id}/messages`, { body }),

    /** POST /conversations/:id/read: mark the thread read for the caller. */
    markRead: (id: string) => http.post<ConversationResponse>(`/conversations/${id}/read`),
  };
}

export type ConversationsApi = ReturnType<typeof createConversationsApi>;
