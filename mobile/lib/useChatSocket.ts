/**
 * Real-time chat wiring (mounted once in the root layout, like
 * {@link usePushNotifications}). Once the session is authenticated it connects the
 * shared Socket.io client, primes the conversation list / unread badge, and routes
 * `message:new` / `conversation:read` / `conversation:new` events into the chat
 * store. Disconnects and clears chat state on sign-out.
 */
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { connectSocket, disconnectSocket } from './socket';
import type { Message } from '@/types';

export function useChatSocket(ready: boolean): void {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (!ready || status !== 'authenticated') {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();
    if (!socket) return;

    const onMessage = (payload: { conversationId: string; message: Message }) => {
      if (payload?.conversationId && payload.message) {
        useChatStore.getState().onMessageNew(payload.conversationId, payload.message);
      }
    };
    const onRead = (payload: { conversationId: string }) => {
      if (payload?.conversationId) useChatStore.getState().onConversationRead(payload.conversationId);
    };
    const onDelivered = (payload: { conversationId: string }) => {
      if (payload?.conversationId) useChatStore.getState().onConversationDelivered(payload.conversationId);
    };
    const onNewConversation = () => {
      void useChatStore.getState().loadConversations();
    };

    socket.on('message:new', onMessage);
    socket.on('conversation:read', onRead);
    socket.on('conversation:delivered', onDelivered);
    socket.on('conversation:new', onNewConversation);

    // Prime the conversation list + unread badge on (re)connect.
    void useChatStore.getState().loadConversations();

    return () => {
      socket.off('message:new', onMessage);
      socket.off('conversation:read', onRead);
      socket.off('conversation:delivered', onDelivered);
      socket.off('conversation:new', onNewConversation);
    };
  }, [ready, status]);

  // Reset chat state when the session ends.
  useEffect(() => {
    if (status === 'unauthenticated') {
      disconnectSocket();
      useChatStore.getState().reset();
    }
  }, [status]);
}
