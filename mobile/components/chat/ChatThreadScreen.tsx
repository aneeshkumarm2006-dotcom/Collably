/**
 * Shared chat thread — the message timeline + composer for one conversation.
 * Used by both the creator and business `chat/[id]` routes (it's role-agnostic;
 * the API returns viewer-relative data). Messages live in the chat store (kept
 * live by `useChatSocket`); this screen loads history, pages older messages,
 * marks the thread read, and relays typing indicators over the socket.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { ErrorState } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import type { Conversation, Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';

const EMPTY: Message[] = [];

export function ChatThreadScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((s) => s.user?._id);

  const messages = useChatStore((s) => (id ? s.messages[id] : undefined)) ?? EMPTY;
  const [conv, setConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingFromOther, setTypingFromOther] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const otherUserId = conv?.otherParticipant?._id;

  // Initial load: resolve the thread (store, else fetch) + first page of messages.
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const fromStore = useChatStore.getState().conversations.find((c) => c._id === id);
        if (fromStore) {
          if (active) setConv(fromStore);
        } else {
          const { data } = await api.get<{ conversation: Conversation }>(`/conversations/${id}`);
          if (active) setConv(data.conversation);
        }
        await useChatStore.getState().loadMessages(id);
        if (active) setError(null);
      } catch (err) {
        if (active) setError(isApiError(err) ? err.message : 'Could not open this conversation.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  // Mark read on focus and whenever a new message lands while we're viewing.
  useFocusEffect(
    useCallback(() => {
      if (id) void useChatStore.getState().markRead(id);
    }, [id]),
  );
  useEffect(() => {
    if (id && messages.length > 0) void useChatStore.getState().markRead(id);
  }, [id, messages.length]);

  // Typing indicator: listen for the other side, with a short auto-clear.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;
    let clearTimer: ReturnType<typeof setTimeout> | undefined;
    const onTyping = (p: { conversationId?: string; isTyping?: boolean }) => {
      if (p?.conversationId !== id) return;
      setTypingFromOther(Boolean(p.isTyping));
      if (clearTimer) clearTimeout(clearTimer);
      if (p.isTyping) clearTimer = setTimeout(() => setTypingFromOther(false), 4000);
    };
    socket.on('typing', onTyping);
    return () => {
      socket.off('typing', onTyping);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [id]);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      const socket = getSocket();
      if (socket && id && otherUserId) {
        socket.emit('typing', { conversationId: id, toUserId: otherUserId, isTyping });
      }
    },
    [id, otherUserId],
  );

  const send = useCallback(
    (body: string) => {
      if (!id) return;
      void useChatStore.getState().sendMessage(id, body).catch((err) => {
        showToast({ message: isApiError(err) ? err.message : 'Message failed to send.', type: 'error' });
      });
    },
    [id],
  );

  const loadOlder = useCallback(async () => {
    if (!id || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const before = messages[messages.length - 1]?.createdAt;
      await useChatStore.getState().loadMessages(id, before);
    } finally {
      setLoadingMore(false);
    }
  }, [id, loadingMore, messages]);

  const title = conv?.otherParticipant?.name ?? 'Chat';
  const subtitle = typingFromOther ? 'typing…' : conv?.campaignTitle;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={title} subtitle={subtitle} onBack={() => router.back()} variant="card" />

      {error && messages.length === 0 ? (
        <ErrorState body={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 8}
        >
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m) => m._id}
            renderItem={({ item }) => (
              <MessageBubble message={item} mine={!!myId && item.senderUserId === myId} />
            )}
            contentContainerStyle={{ paddingVertical: 12, flexGrow: 1, justifyContent: 'flex-end' }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color={colors.text3} style={{ marginVertical: 12 }} />
              ) : null
            }
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator size="small" color={colors.text3} style={{ marginTop: 40 }} />
              ) : null
            }
          />
          <ChatComposer onSend={send} onTyping={emitTyping} />
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
