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
import { SafetyMenu } from '@/components/shared';
import { Avatar, ErrorState, Icon } from '@/components/ui';
import { Pressable } from '@/components/ui/SafePressable';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import type { Conversation, Message } from '@/types';
import { GradientAvatar, MessageBubble, TypingBubble, VerifiedCheck } from './MessageBubble';
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
    (payload: { body?: string; imageUrl?: string }) => {
      if (!id) return;
      void useChatStore.getState().sendMessage(id, payload).catch((err) => {
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
  // The official Local Creator Crew support thread — verified identity, no collab strip.
  const isOfficial = conv?.kind === 'admin';
  const headerSubtitle = typingFromOther ? 'typing…' : isOfficial ? 'Official account · Support' : undefined;

  return (
    // The KeyboardAvoidingView wraps the WHOLE screen (header included) so its top
    // is the window top → keyboardVerticalOffset is 0 and the composer always lifts
    // to sit right above the keyboard on iOS (`padding`).
    //
    // Android is handled at the OS level by `android.softwareKeyboardLayoutMode: "pan"`
    // (app.json): focusing the composer pans the window up so it sits above the
    // keyboard. So Android's behavior stays undefined — using `height` here too would
    // double up with the pan and shove the composer far above the keyboard.
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: pal.chatBg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Custom thread header: back, identity avatar, name (+ verified check for the
          official support thread), a subtitle, and the safety (report/block) menu. */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          paddingHorizontal: 12,
          backgroundColor: colors.bgElev,
          borderBottomWidth: 1,
          borderBottomColor: colors.hair,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => ({ padding: 4, marginLeft: -4, opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name={Platform.OS === 'android' ? 'arrowL' : 'chevL'} size={Platform.OS === 'android' ? 23 : 24} color={colors.text} strokeWidth={2} />
        </Pressable>

        {isOfficial ? (
          <GradientAvatar name={title} size={38} />
        ) : (
          <Avatar src={conv?.otherParticipant?.avatar} name={title} size={38} />
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>
              {title}
            </Text>
            {isOfficial && <VerifiedCheck size={15} />}
          </View>
          {!!headerSubtitle && (
            <Text numberOfLines={1} style={{ fontSize: 12, color: colors.text2, marginTop: 1 }}>
              {headerSubtitle}
            </Text>
          )}
        </View>

        {/* Report/block lives on the thread itself — the surface both stores check
            first for a UGC app. Blocking pops back to the list: the thread stays
            readable, but there's nothing more to do in it. */}
        {conv?.otherParticipant ? (
          <SafetyMenu
            userId={String(conv.otherParticipant._id)}
            name={conv.otherParticipant.name}
            onBlocked={() => router.back()}
          />
        ) : null}
      </View>

      {/* collab-context strip — reminds you what this thread is about (not on the
          official support thread, which has no campaign). */}
      {conv?.campaignTitle && !isOfficial ? (
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
            // Inverted: ListFooter renders at the TOP. Show the paging spinner while
            // loading older history, otherwise the official-thread intro card.
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color={colors.text3} style={{ marginVertical: 12 }} />
              ) : isOfficial ? (
                <WelcomeCard name={title} />
              ) : null
            }
            ListEmptyComponent={loading ? <ActivityIndicator size="small" color={colors.text3} style={{ marginTop: 40 }} /> : null}
          />
          <ChatComposer onSend={send} onTyping={emitTyping} bottomInset={kbVisible ? 0 : insets.bottom} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/**
 * Intro card at the very top of the official Local Creator Crew support thread —
 * a big gradient avatar, the verified name, and a short welcome line. Only rendered
 * for `kind === 'admin'` conversations.
 */
function WelcomeCard({ name }: { name: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 18, paddingBottom: 8, gap: 9 }}>
      <GradientAvatar name={name} size={60} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>{name}</Text>
        <VerifiedCheck size={15} />
      </View>
      <Text style={{ fontSize: 13, lineHeight: 19, color: colors.text2, textAlign: 'center', maxWidth: 260 }}>
        This is your direct line to the Local Creator Crew team. We'll message you here about your profile and collabs.
      </Text>
    </View>
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
