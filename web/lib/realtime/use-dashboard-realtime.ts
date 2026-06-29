'use client';

/**
 * Dashboard realtime wiring (Phase 9 chat + Phase 10 notifications) — mounted once
 * in the dashboard shell, the web counterpart of `mobile/lib/useChatSocket`. Once a
 * session is present it fetches a socket token, connects the shared Socket.io
 * client, and folds the server events into the TanStack Query cache:
 *
 *   • `message:new`       → upsert into the thread history + refresh the list/badge
 *   • `conversation:read` → stamp read receipts on my outgoing messages
 *   • `notification:new`  → invalidate the notifications feed (bell + full list)
 *
 * Persistence/validation stays on REST; the socket only carries live deltas. The
 * notification list queries also refetch on window focus (see `useNotifications`),
 * so anything missed while the socket was down resurfaces on return to the tab.
 * Disconnects on sign-out or when the shell unmounts (leaving the dashboard).
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Message } from '@/lib/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { connectSocket, disconnectSocket, fetchSocketToken } from '@/lib/socket';
import {
  invalidateConversationList,
  invalidateNotifications,
  markOutgoingRead,
  upsertMessage,
} from '@/lib/api/queries';

interface MessageNewPayload {
  conversationId?: string;
  message?: Message;
}
interface ConversationReadPayload {
  conversationId?: string;
  byUserId?: string;
}

export function useDashboardRealtime(): void {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      disconnectSocket();
      return;
    }

    let cancelled = false;
    let detach = () => {};

    void (async () => {
      const token = await fetchSocketToken();
      if (!token || cancelled) return;

      const socket = connectSocket(token);

      const onMessage = (payload: MessageNewPayload) => {
        if (!payload?.conversationId || !payload.message) return;
        upsertMessage(qc, payload.conversationId, payload.message);
        // Refresh previews + viewer-relative unread counts (sidebar badge).
        invalidateConversationList(qc);
      };
      const onRead = (payload: ConversationReadPayload) => {
        if (payload?.conversationId) markOutgoingRead(qc, payload.conversationId, userId);
      };
      // A new in-app notification arrived — refetch so the bell badge, dropdown,
      // and full feed reconcile against the server (the source of unread truth).
      const onNotification = () => invalidateNotifications(qc);

      socket.on('message:new', onMessage);
      socket.on('conversation:read', onRead);
      socket.on('notification:new', onNotification);
      detach = () => {
        socket.off('message:new', onMessage);
        socket.off('conversation:read', onRead);
        socket.off('notification:new', onNotification);
      };
    })();

    return () => {
      cancelled = true;
      detach();
      disconnectSocket();
    };
  }, [userId, qc]);
}
