/**
 * Notifications (PRD §7.3, §9.3). The user's in-app feed, newest first, with unread
 * dots and a "Mark all read" action. Tapping a notification routes to its
 * `deepLinkPath` (resolved into the creator stack) — the in-app half of the push
 * deep-linking finished in Phase 15.
 */
import { useCallback } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { Button, EmptyState, ErrorState, Icon, SkeletonListItem, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatRelativeTime } from '@/lib/utils';
import { resolveCreatorDeepLink } from '@/lib/deepLink';
import { useNotificationStore } from '@/store/notificationStore';
import type { Notification, NotificationType } from '@/types';

type NotificationPage = { data: Notification[]; unreadCount: number };

/** Notification type → icon + tone key for the leading bubble. */
const TYPE_ICON: Record<string, { icon: IconName; tone: 'accent' | 'success' | 'warn' | 'danger' | 'muted' }> = {
  application_accepted: { icon: 'checkcircle', tone: 'success' },
  application_rejected: { icon: 'info', tone: 'muted' },
  submission_received: { icon: 'upload', tone: 'accent' },
  submission_verified: { icon: 'badge', tone: 'success' },
  revision_requested: { icon: 'edit', tone: 'warn' },
  submission_reminder: { icon: 'clock', tone: 'warn' },
  new_application: { icon: 'users', tone: 'accent' },
  campaign_expiring: { icon: 'clock', tone: 'warn' },
  collab_failed: { icon: 'alert', tone: 'danger' },
  account_created: { icon: 'person', tone: 'accent' },
  password_reset: { icon: 'lock', tone: 'muted' },
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clearBadge = useNotificationStore((s) => s.clear);
  const refreshBadge = useNotificationStore((s) => s.refresh);

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<NotificationPage>('/notifications', { params: { limit: 50 } });
    return res;
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const items = data?.data ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  const markAllRead = async () => {
    setData((prev) => (prev ? { ...prev, data: prev.data.map((n) => ({ ...n, isRead: true })), unreadCount: 0 } : prev));
    clearBadge();
    try {
      await api.patch('/notifications/read');
    } catch {
      // Re-sync on failure so the badge isn't wrong.
      reload();
      refreshBadge();
    }
  };

  const onPressItem = (n: Notification) => {
    router.push(resolveCreatorDeepLink(n.deepLinkPath));
  };

  const toneColor = (tone: 'accent' | 'success' | 'warn' | 'danger' | 'muted'): [string, string] => {
    switch (tone) {
      case 'success':
        return [colors.successSoft, colors.success];
      case 'warn':
        return [colors.warnSoft, colors.warn];
      case 'danger':
        return [`${colors.danger}1A`, colors.danger];
      case 'muted':
        return [colors.cardSunk, colors.text2];
      default:
        return [colors.accentSoft, colors.accent];
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Notifications"
        onBack={() => router.back()}
        variant="card"
        right={
          hasUnread ? (
            <Button variant="ghost" size="sm" onPress={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {loading && !data ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonListItem key={i} />
          ))}
        </View>
      ) : error && !data ? (
        <ErrorState body={error} onRetry={reload} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const meta = TYPE_ICON[item.type as NotificationType] ?? { icon: 'bell' as IconName, tone: 'accent' as const };
            const [bg, fg] = toneColor(meta.tone);
            return (
              <Pressable
                onPress={() => onPressItem(item)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: item.isRead ? 'transparent' : colors.accentSoft,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={meta.icon} size={20} color={fg} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14.5, color: colors.text, lineHeight: 20 }}>{item.message}</Text>
                  <Text style={{ fontSize: 12, color: colors.text3, marginTop: 3 }}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
                {!item.isRead && (
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent }} />
                )}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.hair, marginLeft: 68 }} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="bell"
              title="You're all caught up"
              body="Updates about your applications and collabs will show up here."
            />
          }
        />
      )}
    </View>
  );
}
