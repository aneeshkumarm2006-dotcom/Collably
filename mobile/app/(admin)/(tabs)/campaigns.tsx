/**
 * Admin campaigns (PRD §7.5). Every campaign across all businesses, filterable by
 * status and a flagged-only (spam) view, with title search. Each row is swipeable
 * and long-press opens the full menu: force-close (bypasses the §12 transition
 * machine), feature / unfeature, mark / unmark spam, or delete (cascades the
 * campaign's applications). Mutations are optimistic and revert on failure.
 *
 *   GET    /api/admin/campaigns?status=&q=&flagged=
 *   PATCH  /api/admin/campaigns/:id   { forceClose | isFeatured | isSpam }
 *   DELETE /api/admin/campaigns/:id
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { TextInput } from '@/components/ui/SafeTextInput';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, SwipeableRow, type SwipeAction } from '@/components/shared';
import { CampaignCard } from '@/components/campaign';
import { Badge, EmptyState, ErrorState, Icon, SkeletonCard, TagChip } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { CampaignStatus } from '@/constants';
import type { Campaign, BusinessProfile } from '@/types';

/** A campaign with its joined business profile (admin list populates `businessId`). */
type AdminCampaign = Campaign & { business?: BusinessProfile };

const TABS: { key: string; label: string; status?: CampaignStatus; flagged?: boolean }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active', status: 'Active' },
  { key: 'draft', label: 'Drafts', status: 'Draft' },
  { key: 'paused', label: 'Paused', status: 'Paused' },
  { key: 'closed', label: 'Closed', status: 'Closed' },
  { key: 'flagged', label: 'Flagged', flagged: true },
];

export default function AdminCampaignsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const active = TABS.find((t) => t.key === tab)!;

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const params: Record<string, string> = { limit: '50' };
    if (active.status) params.status = active.status;
    if (active.flagged) params.flagged = 'true';
    if (query) params.q = query;
    const { data: res } = await api.get<{ data: AdminCampaign[] }>('/admin/campaigns', { params });
    return res.data;
  }, [tab, query]);

  useFocusEffect(useCallback(() => reload(), [reload]));

  // --- Mutations (optimistic) -------------------------------------------------

  const patch = async (c: AdminCampaign, body: Record<string, boolean>, optimistic: Partial<AdminCampaign>) => {
    setData((list) => list?.map((x) => (x._id === c._id ? { ...x, ...optimistic } : x)) ?? list);
    try {
      await api.patch(`/admin/campaigns/${c._id}`, body);
    } catch (err) {
      setData((list) => list?.map((x) => (x._id === c._id ? c : x)) ?? list);
      Alert.alert('Could not update', isApiError(err) ? err.message : 'Please try again.');
    }
  };

  const forceClose = (c: AdminCampaign) => {
    Alert.alert('Force-close campaign?', `"${c.title}" will be closed immediately, regardless of its current state.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Force close', style: 'destructive', onPress: () => void patch(c, { forceClose: true }, { status: 'Closed' }) },
    ]);
  };

  const toggleFeature = (c: AdminCampaign) => void patch(c, { isFeatured: !c.isFeatured }, { isFeatured: !c.isFeatured });
  const toggleSpam = (c: AdminCampaign) => void patch(c, { isSpam: !c.isSpam }, { isSpam: !c.isSpam });

  const remove = (c: AdminCampaign) => {
    Alert.alert('Delete campaign?', `This permanently deletes "${c.title}" and its applications. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setData((list) => list?.filter((x) => x._id !== c._id) ?? list);
          try {
            await api.delete(`/admin/campaigns/${c._id}`);
          } catch (err) {
            reload();
            Alert.alert('Could not delete', isApiError(err) ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  const openMenu = (c: AdminCampaign) => {
    Alert.alert(c.title, c.business?.businessName, [
      ...(c.status !== 'Closed' && c.status !== 'Completed'
        ? [{ text: 'Force close', style: 'destructive' as const, onPress: () => forceClose(c) }]
        : []),
      { text: c.isFeatured ? 'Unfeature' : 'Feature', onPress: () => toggleFeature(c) },
      { text: c.isSpam ? 'Unmark spam' : 'Mark as spam', style: c.isSpam ? undefined : ('destructive' as const), onPress: () => toggleSpam(c) },
      { text: 'Delete', style: 'destructive', onPress: () => remove(c) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const actionsFor = (c: AdminCampaign): SwipeAction[] => {
    const actions: SwipeAction[] = [
      c.isFeatured
        ? { key: 'unfeature', label: 'Unfeature', icon: 'star', color: colors.text3, onPress: () => toggleFeature(c) }
        : { key: 'feature', label: 'Feature', icon: 'star', color: colors.money, onPress: () => toggleFeature(c) },
      c.isSpam
        ? { key: 'unspam', label: 'Not spam', icon: 'check', color: colors.success, onPress: () => toggleSpam(c) }
        : { key: 'spam', label: 'Spam', icon: 'alert', color: colors.warn, onPress: () => toggleSpam(c) },
    ];
    if (c.status !== 'Closed' && c.status !== 'Completed') {
      actions.push({ key: 'close', label: 'Close', icon: 'x', color: colors.danger, onPress: () => forceClose(c) });
    } else {
      actions.push({ key: 'delete', label: 'Delete', icon: 'trash', color: colors.danger, onPress: () => remove(c) });
    }
    return actions;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Campaigns" large />

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
            placeholder="Search by title"
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

      {/* Status tabs */}
      <View style={{ paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.hair, backgroundColor: colors.bgElev }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TABS.map((t) => (
            <TagChip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>
      </View>

      {loading && !data ? (
        <View style={{ padding: 16, gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
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
                {(item.isFeatured || item.isSpam) && (
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    {item.isFeatured && <Badge tone="money" label="Featured" />}
                    {item.isSpam && <Badge tone="danger" label="Flagged spam" />}
                  </View>
                )}
                <CampaignCard
                  campaign={item}
                  businessName={item.business?.businessName ?? 'Business'}
                  onPress={() => openMenu(item)}
                />
              </Pressable>
            </SwipeableRow>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase"
              title={query ? 'No matches' : 'No campaigns'}
              body={query ? `No campaigns match "${query}".` : 'No campaigns with this filter.'}
            />
          }
        />
      )}
    </View>
  );
}
