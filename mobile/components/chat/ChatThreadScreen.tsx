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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { ErrorState, Icon } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import type { Conversation, Message } from '@/types';
import { MessageBubble, TypingBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { useChatPalette } from './chatTheme';
import { dayLabel, sameDay } from './time';

const EMPTY: Message[] = [];

export function ChatThreadScreen() {
  const { colors } = useTheme();
  const pal = useChatPalette();
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
  const [hasMore, setHasMore] = useState(true);
  const [kbVisible, setKbVisible] = useState(false);

  const otherUserId = conv?.otherParticipant?._id;

  // Track the keyboard so the composer only adds home-indicator clearance when the
  // keyboard is down (no awkward gap above the keyboard while typing).
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, () => setKbVisible(true));
    const hide = Keyboard.addListener(hideEvt, () => setKbVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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

  // New thread → reset the "more history" flag so paging works again.
  useEffect(() => {
    setHasMore(true);
  }, [id]);

  // Mark read on focus, and when a NEW INCOMING message arrives (not our own
  // sends) — avoids a write on every message-length change.
  useFocusEffect(
    useCallback(() => {
      if (id) void useChatStore.getState().markRead(id);
    }, [id]),
  );
  const newestId = messages[0]?._id;
  const newestIncoming = !!myId && !!messages[0] && messages[0].senderUserId !== myId;
  useEffect(() => {
    if (id && newestId && newestIncoming) void useChatStore.getState().markRead(id);
  }, [id, newestId, newestIncoming]);

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
    if (!id || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const prevLen = messages.length;
    try {
      const before = messages[messages.length - 1]?.createdAt;
      await useChatStore.getState().loadMessages(id, before);
      // Nothing new came back → we've reached the start of history; stop paging.
      const newLen = (useChatStore.getState().messages[id] ?? []).length;
      if (newLen <= prevLen) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [id, loadingMore, hasMore, messages]);

  const title = conv?.otherParticipant?.name ?? 'Chat';
  const subtitle = typingFromOther ? 'typing…' : conv?.campaignTitle;

  return (
    // The KeyboardAvoidingView wraps the WHOLE screen (header included) so its top
    // is the window top → keyboardVerticalOffset is 0 and the composer always lifts
    // to sit right above the keyboard, on every device.
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: pal.chatBg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title={title} subtitle={subtitle} onBack={() => router.back()} variant="card" />

      {/* collab-context strip — reminds you what this thread is about */}
      {conv?.campaignTitle ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.accentSoft }}>
          <Icon name="briefcase" size={13} color={colors.accent} strokeWidth={2.2} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.accent }}>
            Collab · {conv.campaignTitle}
          </Text>
        </View>
      ) : null}

      {error && messages.length === 0 ? (
        <ErrorState body={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={messages}
            style={{ flex: 1 }}
            inverted
            keyExtractor={(m) => m._id}
            renderItem={({ item, index }) => {
              const mine = !!myId && item.senderUserId === myId;
              const older = messages[index + 1]; // inverted: next item is chronologically earlier
              const tight = !!older && older.senderUserId === item.senderUserId && sameDay(older.createdAt, item.createdAt);
              const showDate = !older || !sameDay(older.createdAt, item.createdAt);
              return (
                <View>
                  {showDate ? <DateSeparator label={dayLabel(item.createdAt)} /> : null}
                  <MessageBubble message={item} mine={mine} tight={tight} />
                </View>
              );
            }}
            contentContainerStyle={{ paddingVertical: 10 }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            // Inverted: ListHeader renders at the BOTTOM — perfect for the typing bubble.
            ListHeaderComponent={typingFromOther ? <TypingBubble /> : null}
            ListFooterComponent={
              loadingMore ? <ActivityIndicator size="small" color={colors.text3} style={{ marginVertical: 12 }} /> : null
            }
            ListEmptyComponent={loading ? <ActivityIndicator size="small" color={colors.text3} style={{ marginTop: 40 }} /> : null}
          />
          <ChatComposer onSend={send} onTyping={emitTyping} bottomInset={kbVisible ? 0 : insets.bottom} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Centered WhatsApp-style date pill between days. */
function DateSeparator({ label }: { label: string }) {
  const pal = useChatPalette();
  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <View style={{ backgroundColor: pal.pillBg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}>
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: pal.pillText, letterSpacing: 0.3 }}>{label}</Text>
      </View>
    </View>
  );
}
