/**
 * Shared "Messages" screen — the caller's chat threads, newest activity first.
 * Mounted by a thin per-role route wrapper that passes its `group` so taps push
 * the role-correct `/(group)/chat/:id`. Data + unread come from the chat store,
 * kept live by `useChatSocket`; pulling refreshes from the server.
 */
import { useCallback } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { EmptyState } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { useChatStore } from '@/store/chatStore';
import { ConversationRow } from './ConversationRow';

export function ConversationListScreen({ group }: { group: '(creator)' | '(business)' }) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.loadingConversations);
  const load = useChatStore((s) => s.loadConversations);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Messages" large />
      <FlatList
        data={conversations}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() => router.push(`/${group}/chat/${item._id}` as Href)}
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: colors.hair, marginLeft: 78 }} />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="message"
            title="No messages yet"
            body="When a collab connects you with a brand or creator, your chat shows up here."
          />
        }
      />
    </View>
  );
}
