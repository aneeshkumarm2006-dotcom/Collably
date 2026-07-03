/**
 * Admin businesses (PRD §7.5). Every business profile, searchable by name, with
 * the moderation fields the dashboard can't show: verification and suspension.
 * Each row is swipeable and long-press opens the full menu: verify / unverify and
 * suspend / unsuspend. A pushed stack screen reached from the dashboard's Manage
 * list. Mutations are optimistic and revert on failure.
 *
 *   GET   /api/admin/businesses?q=
 *   PATCH /api/admin/businesses/:id   { isVerified | isSuspended }
 */
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { TextInput } from '@/components/ui/SafeTextInput';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, SwipeableRow, type SwipeAction } from '@/components/shared';
import { Avatar, Badge, Card, EmptyState, ErrorState, Icon, SkeletonListItem } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { BusinessProfile, UserSummary } from '@/types';

type AdminBusiness = BusinessProfile & { user?: UserSummary | null };

export default function AdminBusinessesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const params: Record<string, string> = { limit: '50' };
    if (query) params.q = query;
    const { data: res } = await api.get<{ data: AdminBusiness[] }>('/admin/businesses', { params });
    return res.data;
  }, [query]);

  const patch = async (b: AdminBusiness, body: { isVerified?: boolean; isSuspended?: boolean }, optimistic: Partial<AdminBusiness>) => {
    setData((list) => list?.map((x) => (x._id === b._id ? { ...x, ...optimistic } : x)) ?? list);
    try {
      await api.patch(`/admin/businesses/${b._id}`, body);
    } catch (err) {
      setData((list) => list?.map((x) => (x._id === b._id ? b : x)) ?? list);
      Alert.alert('Could not update', isApiError(err) ? err.message : 'Please try again.');
    }
  };

  const toggleVerify = (b: AdminBusiness) => void patch(b, { isVerified: !b.isVerified }, { isVerified: !b.isVerified });

  const toggleSuspend = (b: AdminBusiness) => {
    const next = !b.isSuspended;
    Alert.alert(
      next ? 'Suspend business?' : 'Unsuspend business?',
      next ? `${b.businessName} will be flagged as suspended.` : `${b.businessName} will be reinstated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: next ? 'Suspend' : 'Unsuspend', style: next ? 'destructive' : 'default', onPress: () => void patch(b, { isSuspended: next }, { isSuspended: next }) },
      ],
    );
  };

  const openMenu = (b: AdminBusiness) => {
    Alert.alert(b.businessName, b.user?.name ?? b.category, [
      { text: b.isVerified ? 'Remove verification' : 'Verify', onPress: () => toggleVerify(b) },
      { text: b.isSuspended ? 'Unsuspend' : 'Suspend', style: b.isSuspended ? undefined : 'destructive', onPress: () => toggleSuspend(b) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const actionsFor = (b: AdminBusiness): SwipeAction[] => [
    b.isVerified
      ? { key: 'unverify', label: 'Unverify', icon: 'badge', color: colors.text3, onPress: () => toggleVerify(b) }
      : { key: 'verify', label: 'Verify', icon: 'badge', color: colors.accent, onPress: () => toggleVerify(b) },
    b.isSuspended
      ? { key: 'unsuspend', label: 'Unsuspend', icon: 'check', color: colors.success, onPress: () => toggleSuspend(b) }
      : { key: 'suspend', label: 'Suspend', icon: 'lock', color: colors.danger, onPress: () => toggleSuspend(b) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Businesses" onBack={() => router.back()} variant="card" />

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.bgElev, borderBottomWidth: 1, borderBottomColor: colors.hair }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardSunk, borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
          <Icon name="search" size={18} color={colors.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search businesses"
            placeholderTextColor={colors.text3}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, fontSize: 15, color: colors.text }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Icon name="x" size={18} color={colors.text3} />
            </Pressable>
          )}
        </View>
      </View>

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
          renderItem={({ item }) => (
            <SwipeableRow actions={actionsFor(item)}>
              <Pressable onLongPress={() => openMenu(item)} delayLongPress={300}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar src={item.logo} name={item.businessName} size={46} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '700', color: colors.text }}>
                      {item.businessName}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 13, color: colors.text2, marginTop: 1 }}>
                      {item.category} · {item.totalCampaigns} campaigns
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                      {item.isVerified && <Badge tone="accent" label="Verified" />}
                      {item.isSuspended && <Badge tone="danger" label="Suspended" />}
                      {!item.isVerified && !item.isSuspended && <Badge tone="muted" label="Unverified" />}
                    </View>
                  </View>
                </Card>
              </Pressable>
            </SwipeableRow>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="store"
              title={query ? 'No matches' : 'No businesses'}
              body={query ? `No businesses match "${query}".` : 'No business profiles yet.'}
            />
          }
        />
      )}
    </View>
  );
}
