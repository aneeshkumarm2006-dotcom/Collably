/**
 * Admin users (PRD §7.5). Every account on the platform, filterable by role and a
 * banned-only view, with name/email search. Each row is swipeable and long-press
 * opens the full action menu: ban / unban, change role, or delete (which cascades
 * the user's profile + campaigns/applications on the backend). You can't ban or
 * delete your own account. Mutations are optimistic and revert on failure.
 *
 *   GET    /api/admin/users?role=&q=&banned=
 *   PATCH  /api/admin/users/:id   { isBanned | role }
 *   DELETE /api/admin/users/:id
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, SwipeableRow, type SwipeAction } from '@/components/shared';
import { Avatar, Badge, Card, EmptyState, ErrorState, Icon, SkeletonListItem, TagChip, type BadgeTone } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAuthStore } from '@/store/authStore';
import { USER_ROLES, type UserRole } from '@/constants';
import type { PublicUser } from '@/types';

const TABS: { key: string; label: string; role?: UserRole; banned?: boolean }[] = [
  { key: 'all', label: 'All' },
  { key: 'business', label: 'Businesses', role: 'business' },
  { key: 'creator', label: 'Creators', role: 'creator' },
  { key: 'admin', label: 'Admins', role: 'admin' },
  { key: 'banned', label: 'Banned', banned: true },
];

const ROLE_TONE: Record<UserRole, BadgeTone> = { business: 'accent', creator: 'success', admin: 'warn' };

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const active = TABS.find((t) => t.key === tab)!;

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const params: Record<string, string> = { limit: '50' };
    if (active.role) params.role = active.role;
    if (active.banned) params.banned = 'true';
    if (query) params.q = query;
    const { data: res } = await api.get<{ data: PublicUser[] }>('/admin/users', { params });
    return res.data;
  }, [tab, query]);

  useFocusEffect(useCallback(() => reload(), [reload]));

  // --- Mutations (optimistic) -------------------------------------------------

  const patch = async (u: PublicUser, body: { isBanned?: boolean; role?: UserRole }, optimistic: Partial<PublicUser>) => {
    setData((list) => list?.map((x) => (x._id === u._id ? { ...x, ...optimistic } : x)) ?? list);
    try {
      await api.patch(`/admin/users/${u._id}`, body);
    } catch (err) {
      setData((list) => list?.map((x) => (x._id === u._id ? u : x)) ?? list);
      Alert.alert('Could not update', isApiError(err) ? err.message : 'Please try again.');
    }
  };

  const toggleBan = (u: PublicUser) => {
    if (u._id === me?._id) {
      Alert.alert('Not allowed', 'You cannot ban your own account.');
      return;
    }
    const next = !u.isBanned;
    Alert.alert(
      next ? 'Ban user?' : 'Unban user?',
      next ? `${u.name} will be unable to sign in.` : `${u.name} will be able to sign in again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Ban' : 'Unban',
          style: next ? 'destructive' : 'default',
          onPress: () => void patch(u, { isBanned: next }, { isBanned: next }),
        },
      ],
    );
  };

  const changeRole = (u: PublicUser) => {
    const options = USER_ROLES.filter((r) => r !== u.role).map((r) => ({
      text: `Make ${r}`,
      onPress: () => void patch(u, { role: r }, { role: r }),
    }));
    Alert.alert('Change role', `${u.name} is currently a ${u.role}.`, [
      ...options,
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const remove = (u: PublicUser) => {
    if (u._id === me?._id) {
      Alert.alert('Not allowed', 'You cannot delete your own account.');
      return;
    }
    Alert.alert(
      'Delete user?',
      `This permanently deletes ${u.name} and all their data (profile, campaigns, applications). This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setData((list) => list?.filter((x) => x._id !== u._id) ?? list);
            try {
              await api.delete(`/admin/users/${u._id}`);
            } catch (err) {
              reload();
              Alert.alert('Could not delete', isApiError(err) ? err.message : 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const openMenu = (u: PublicUser) => {
    const isSelf = u._id === me?._id;
    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];
    if (!isSelf) options.push({ text: u.isBanned ? 'Unban' : 'Ban', style: u.isBanned ? undefined : 'destructive', onPress: () => toggleBan(u) });
    options.push({ text: 'Change role', onPress: () => changeRole(u) });
    if (!isSelf) options.push({ text: 'Delete', style: 'destructive', onPress: () => remove(u) });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(u.name, u.email, options);
  };

  const actionsFor = (u: PublicUser): SwipeAction[] => {
    const actions: SwipeAction[] = [{ key: 'role', label: 'Role', icon: 'refresh', color: colors.text3, onPress: () => changeRole(u) }];
    if (u._id !== me?._id) {
      actions.push(
        u.isBanned
          ? { key: 'unban', label: 'Unban', icon: 'check', color: colors.success, onPress: () => toggleBan(u) }
          : { key: 'ban', label: 'Ban', icon: 'lock', color: colors.warn, onPress: () => toggleBan(u) },
      );
      actions.push({ key: 'delete', label: 'Delete', icon: 'trash', color: colors.danger, onPress: () => remove(u) });
    }
    return actions;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Users" large />

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.cardSunk,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 42,
          }}
        >
          <Icon name="search" size={18} color={colors.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or email"
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

      {/* Role tabs */}
      <View style={{ paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.hair, backgroundColor: colors.bgElev }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TABS.map((t) => (
            <TagChip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>
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
                  <Avatar src={item.avatar} name={item.name} size={46} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '700', color: colors.text }}>
                      {item.name}
                      {item._id === me?._id ? '  (you)' : ''}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 13, color: colors.text2, marginTop: 1 }}>
                      {item.email}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                      <Badge tone={ROLE_TONE[item.role]} label={item.role} />
                      {item.isBanned && <Badge tone="danger" label="Banned" />}
                      {!item.isVerified && <Badge tone="muted" label="Unverified" />}
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
              icon="users"
              title={query ? 'No matches' : 'No users'}
              body={query ? `No users match "${query}".` : 'No users with this filter.'}
            />
          }
        />
      )}
    </View>
  );
}
