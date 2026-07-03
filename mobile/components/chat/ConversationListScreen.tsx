/**
 * Shared "Messages" screen — WhatsApp-premium: a search field + All/Unread filter
 * pills above the thread list. Data + unread come from the chat store, kept live by
 * `useChatSocket`; pulling refreshes from the server.
 */
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { TextInput } from '@/components/ui/SafeTextInput';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/SafePressable';
import { Header } from '@/components/shared';
import { EmptyState, Icon } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { ConversationRow } from './ConversationRow';

type Filter = 'all' | 'unread';

export function ConversationListScreen({ group }: { group: '(creator)' | '(business)' }) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myId = useAuthStore((s) => s.user?._id);

  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.loadingConversations);
  const load = useChatStore((s) => s.loadConversations);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const unreadTotal = useMemo(() => conversations.filter((c) => (c.unreadCount ?? 0) > 0).length, [conversations]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === 'unread' && (c.unreadCount ?? 0) === 0) return false;
      if (!q) return true;
      return (
        (c.otherParticipant?.name ?? '').toLowerCase().includes(q) ||
        (c.campaignTitle ?? '').toLowerCase().includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q)
      );
    });
  }, [conversations, query, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Messages" large />

      {/* search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardSunk, borderRadius: 12, paddingHorizontal: 12, height: 40 }}>
          <Icon name="search" size={17} color={colors.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chats"
            placeholderTextColor={colors.text3}
            style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="x" size={16} color={colors.text3} />
            </Pressable>
          )}
        </View>
      </View>

      {/* filter pills */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        <FilterPill label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterPill label={unreadTotal > 0 ? `Unread ${unreadTotal}` : 'Unread'} active={filter === 'unread'} onPress={() => setFilter('unread')} />
      </View>

      <FlatList
        data={shown}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <ConversationRow conversation={item} mineId={myId} onPress={() => router.push(`/${group}/chat/${item._id}` as Href)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.hair, marginLeft: 83 }} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.accent} />}
        ListEmptyComponent={
          query || filter === 'unread' ? (
            <EmptyState icon="search" title="No chats found" body="Try a different search or filter." />
          ) : (
            <EmptyState icon="message" title="No messages yet" body="When a collab connects you with a brand or creator, your chat shows up here." />
          )
        }
      />
    </View>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? colors.accentSoft : colors.cardSunk,
        borderWidth: 1,
        borderColor: active ? colors.accent : 'transparent',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? colors.accent : colors.text2 }}>{label}</Text>
    </Pressable>
  );
}
