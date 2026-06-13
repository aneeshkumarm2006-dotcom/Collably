/**
 * Admin creators (PRD §7.5). Every creator profile with the one moderation lever
 * the spec calls for: suspend / unsuspend. Each row is swipeable and long-press
 * opens the same action. A pushed stack screen reached from the dashboard's Manage
 * list. The creator's display name + avatar come from the joined `user` (they live
 * on the User, not the profile). Mutations are optimistic and revert on failure.
 *
 *   GET   /api/admin/creators
 *   PATCH /api/admin/creators/:id   { isSuspended }
 */
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, SwipeableRow, type SwipeAction } from '@/components/shared';
import { Avatar, Badge, Card, EmptyState, ErrorState, SkeletonListItem } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCompactNumber } from '@/lib/utils';
import type { CreatorProfile, UserSummary } from '@/types';

type AdminCreator = CreatorProfile & { user?: UserSummary | null };

/** Total reach across the creator's linked social handles. */
function totalReach(p: CreatorProfile): number {
  const s = p.socialHandles;
  return (
    (s.instagram?.followerCount ?? 0) + (s.youtube?.subscriberCount ?? 0) + (s.tiktok?.followerCount ?? 0)
  );
}

export default function AdminCreatorsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ data: AdminCreator[] }>('/admin/creators', { params: { limit: '50' } });
    return res.data;
  }, []);

  const toggleSuspend = (c: AdminCreator) => {
    const next = !c.isSuspended;
    const name = c.user?.name ?? 'This creator';
    const apply = async () => {
      setData((list) => list?.map((x) => (x._id === c._id ? { ...x, isSuspended: next } : x)) ?? list);
      try {
        await api.patch(`/admin/creators/${c._id}`, { isSuspended: next });
      } catch (err) {
        setData((list) => list?.map((x) => (x._id === c._id ? c : x)) ?? list);
        Alert.alert('Could not update', isApiError(err) ? err.message : 'Please try again.');
      }
    };
    Alert.alert(
      next ? 'Suspend creator?' : 'Unsuspend creator?',
      next ? `${name} will be flagged as suspended.` : `${name} will be reinstated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: next ? 'Suspend' : 'Unsuspend', style: next ? 'destructive' : 'default', onPress: () => void apply() },
      ],
    );
  };

  const actionsFor = (c: AdminCreator): SwipeAction[] => [
    c.isSuspended
      ? { key: 'unsuspend', label: 'Unsuspend', icon: 'check', color: colors.success, onPress: () => toggleSuspend(c) }
      : { key: 'suspend', label: 'Suspend', icon: 'lock', color: colors.danger, onPress: () => toggleSuspend(c) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Creators" onBack={() => router.back()} variant="card" />

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
          data={data ?? []}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const name = item.user?.name ?? 'Creator';
            const reach = totalReach(item);
            const subtitle = item.niche.length > 0 ? item.niche.slice(0, 3).join(' · ') : 'No niches set';
            return (
              <SwipeableRow actions={actionsFor(item)}>
                <Pressable onLongPress={() => toggleSuspend(item)} delayLongPress={300}>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar src={item.user?.avatar} name={name} size={46} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '700', color: colors.text }}>
                        {name}
                      </Text>
                      <Text numberOfLines={1} style={{ fontSize: 13, color: colors.text2, marginTop: 1 }}>
                        {subtitle}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                        {reach > 0 && <Badge tone="muted" label={`${formatCompactNumber(reach)} reach`} />}
                        {item.isUGCOnly && <Badge tone="accent" label="UGC" />}
                        {item.isSuspended && <Badge tone="danger" label="Suspended" />}
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </SwipeableRow>
            );
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={<EmptyState icon="person" title="No creators" body="No creator profiles yet." />}
        />
      )}
    </View>
  );
}
