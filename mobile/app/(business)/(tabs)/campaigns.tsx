/**
 * Business campaigns tab (PRD §7.4). Every campaign this business owns, filterable
 * by status chips. Each row is swipeable — Edit, Pause/Resume, and Close — and a
 * long-press opens the full action menu (publish, complete, delete) so nothing is
 * gesture-only. A floating action button launches the create flow; tapping a card
 * opens its applicant list.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Pressable } from '@/components/ui/SafePressable';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, NotificationBell, SwipeableRow, type SwipeAction } from '@/components/shared';
import { CampaignCard } from '@/components/campaign';
import { Button, EmptyState, ErrorState, Icon, SkeletonCard, TagChip } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAuthStore } from '@/store/authStore';
import type { CampaignStatus } from '@/constants';
import type { Campaign } from '@/types';

/** One-time "you can swipe" hint (persisted so it shows at most once per install). */
const SWIPE_HINT_KEY = 'collably.campaignSwipeHintDismissed';

const TABS: { key: string; label: string; statuses?: CampaignStatus[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active', statuses: ['Active'] },
  { key: 'draft', label: 'Drafts', statuses: ['Draft'] },
  { key: 'paused', label: 'Paused', statuses: ['Paused'] },
  { key: 'closed', label: 'Closed', statuses: ['Closed', 'Completed'] },
];

export default function BusinessCampaignsScreen() {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('all');
  // Admin approval gate (mirrors the backend `profile.isVerified`). Publishing a
  // Draft to Active 403s until this is true, so we surface the state rather than
  // letting Publish fail silently.
  const approved = useAuthStore((s) => s.approved);

  // One-time swipe hint. Default hidden until we've read the persisted flag, so it
  // never flashes for a user who already dismissed it.
  const [hintDismissed, setHintDismissed] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const seen = Platform.OS === 'web' ? '1' : await SecureStore.getItemAsync(SWIPE_HINT_KEY);
        if (active) setHintDismissed(seen === '1');
      } catch {
        if (active) setHintDismissed(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const dismissHint = useCallback(() => {
    setHintDismissed(true);
    if (Platform.OS !== 'web') void SecureStore.setItemAsync(SWIPE_HINT_KEY, '1').catch(() => {});
  }, []);

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ data: Campaign[] }>('/campaigns', {
      params: { mine: 'true', limit: 50 },
    });
    return res.data;
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const filtered = useMemo(() => {
    const all = data ?? [];
    const active = TABS.find((t) => t.key === tab);
    if (!active?.statuses) return all;
    return all.filter((c) => active.statuses!.includes(c.status));
  }, [data, tab]);

  // --- Mutations (optimistic, revert on failure) ------------------------------

  const setStatus = async (campaign: Campaign, status: CampaignStatus) => {
    const prev = campaign.status;
    setData((list) => list?.map((c) => (c._id === campaign._id ? { ...c, status } : c)) ?? list);
    try {
      await api.patch(`/campaigns/${campaign._id}/status`, { status });
    } catch (err) {
      setData((list) => list?.map((c) => (c._id === campaign._id ? { ...c, status: prev } : c)) ?? list);
      Alert.alert('Could not update', isApiError(err) ? err.message : 'Please try again.');
    }
  };

  /**
   * Publish a Draft. The backend rejects this until the business is verified, so
   * when we already know the account is under review we explain it up front instead
   * of firing a request that would 403.
   */
  const publish = (campaign: Campaign) => {
    if (!approved) {
      Alert.alert(
        'Account under review',
        'Your business is being verified. You can publish this campaign once an admin approves your account.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'View status', onPress: () => router.push('/(business)/(tabs)/profile') },
        ],
      );
      return;
    }
    void setStatus(campaign, 'Active');
  };

  const confirmStatus = (campaign: Campaign, status: CampaignStatus, verb: string) => {
    Alert.alert(`${verb} campaign?`, `"${campaign.title}" will be ${status.toLowerCase()}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: verb,
        style: status === 'Closed' ? 'destructive' : 'default',
        onPress: () => void setStatus(campaign, status),
      },
    ]);
  };

  const remove = (campaign: Campaign) => {
    Alert.alert(
      'Delete campaign?',
      `This permanently deletes "${campaign.title}" and its applications. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setData((list) => list?.filter((c) => c._id !== campaign._id) ?? list);
            try {
              await api.delete(`/campaigns/${campaign._id}`);
            } catch (err) {
              reload();
              Alert.alert('Could not delete', isApiError(err) ? err.message : 'Please try again.');
            }
          },
        },
      ],
    );
  };

  /** Full action menu (long-press) — every valid transition for this status. */
  const openMenu = (c: Campaign) => {
    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Edit', onPress: () => router.push({ pathname: '/(business)/campaigns/[id]/edit', params: { id: c._id } }) },
      {
        text: 'View applicants',
        onPress: () => router.push({ pathname: '/(business)/campaigns/[id]/applications', params: { id: c._id } }),
      },
    ];
    if (c.status === 'Draft') {
      options.push({ text: approved ? 'Publish' : 'Publish (pending approval)', onPress: () => publish(c) });
    }
    if (c.status === 'Active') {
      options.push({ text: 'Pause', onPress: () => void setStatus(c, 'Paused') });
      options.push({ text: 'Close', style: 'destructive', onPress: () => confirmStatus(c, 'Closed', 'Close') });
    }
    if (c.status === 'Paused') {
      options.push({ text: 'Resume', onPress: () => void setStatus(c, 'Active') });
      options.push({ text: 'Close', style: 'destructive', onPress: () => confirmStatus(c, 'Closed', 'Close') });
    }
    if (c.status === 'Active' || c.status === 'Paused') {
      options.push({ text: 'Mark completed', onPress: () => confirmStatus(c, 'Completed', 'Complete') });
    }
    options.push({ text: 'Delete', style: 'destructive', onPress: () => remove(c) });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(c.title, undefined, options);
  };

  /** Swipe actions vary with the campaign's status (PRD §12 transitions). */
  const actionsFor = (c: Campaign): SwipeAction[] => {
    const edit: SwipeAction = {
      key: 'edit',
      label: 'Edit',
      icon: 'edit',
      color: colors.text3,
      onPress: () => router.push({ pathname: '/(business)/campaigns/[id]/edit', params: { id: c._id } }),
    };
    if (c.status === 'Draft') {
      return [
        edit,
        {
          key: 'publish',
          label: approved ? 'Publish' : 'Pending',
          icon: approved ? 'zap' : 'clock',
          color: approved ? colors.accent : colors.warn,
          onPress: () => publish(c),
        },
        { key: 'delete', label: 'Delete', icon: 'trash', color: colors.danger, onPress: () => remove(c) },
      ];
    }
    if (c.status === 'Active') {
      return [
        edit,
        { key: 'pause', label: 'Pause', icon: 'clock', color: colors.warn, onPress: () => void setStatus(c, 'Paused') },
        { key: 'close', label: 'Close', icon: 'x', color: colors.danger, onPress: () => confirmStatus(c, 'Closed', 'Close') },
      ];
    }
    if (c.status === 'Paused') {
      return [
        edit,
        { key: 'resume', label: 'Resume', icon: 'play', color: colors.accent, onPress: () => void setStatus(c, 'Active') },
        { key: 'close', label: 'Close', icon: 'x', color: colors.danger, onPress: () => confirmStatus(c, 'Closed', 'Close') },
      ];
    }
    // Closed / Completed are terminal — only edit-as-reference + delete.
    return [edit, { key: 'delete', label: 'Delete', icon: 'trash', color: colors.danger, onPress: () => remove(c) }];
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Campaigns"
        large
        right={<NotificationBell onPress={() => router.push('/(business)/notifications')} />}
      />

      {/* Status tabs */}
      <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair, backgroundColor: colors.bgElev }}>
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
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <SwipeableRow actions={actionsFor(item)}>
              <View>
                <Pressable onLongPress={() => openMenu(item)} delayLongPress={300}>
                  <CampaignCard
                    campaign={item}
                    businessName="Your campaign"
                    onPress={() =>
                      router.push({ pathname: '/(business)/campaigns/[id]/applications', params: { id: item._id } })
                    }
                  />
                </Pressable>
                {/* Drafts get an always-visible Publish affordance (not gesture-only). */}
                {item.status === 'Draft' && (
                  <DraftPublishBar approved={approved} colors={colors} onPublish={() => publish(item)} />
                )}
              </View>
            </SwipeableRow>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 14, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !hintDismissed && filtered.length > 0 ? (
              <SwipeHint colors={colors} onDismiss={dismissHint} />
            ) : null
          }
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase"
              title={tab === 'all' ? 'No campaigns yet' : 'Nothing here'}
              body={
                tab === 'all'
                  ? 'Post your first campaign to start receiving applications from creators.'
                  : 'No campaigns with this status.'
              }
              action={tab === 'all' ? 'New campaign' : undefined}
              onAction={tab === 'all' ? () => router.push('/(business)/campaigns/new') : undefined}
            />
          }
        />
      )}

      {/* FAB → new campaign */}
      <Pressable
        onPress={() => router.push('/(business)/campaigns/new')}
        accessibilityRole="button"
        accessibilityLabel="New campaign"
        style={({ pressed }) => ({
          position: 'absolute',
          right: 18,
          bottom: insets.bottom + 18,
          height: 56,
          width: 56,
          borderRadius: 28,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.9 : 1,
          ...shadows.card,
        })}
      >
        <Icon name="plus" size={24} color="#fff" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

type Colors = ReturnType<typeof useTheme>['colors'];

/**
 * Publish affordance shown on Draft cards. Approved businesses get a real Publish
 * button; businesses still under review get a clearly-disabled "pending approval"
 * row (tappable for the why) so Publish never fails silently.
 */
function DraftPublishBar({ approved, colors, onPublish }: { approved: boolean; colors: Colors; onPublish: () => void }) {
  if (approved) {
    return (
      <View style={{ marginTop: 8 }}>
        <Button block variant="tonal" size="sm" icon="zap" onPress={onPublish}>
          Publish campaign
        </Button>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPublish}
      accessibilityRole="button"
      accessibilityLabel="Publish pending approval"
      accessibilityState={{ disabled: true }}
      accessibilityHint="Your account is under review. You can publish once approved."
      style={({ pressed }) => ({
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.warnSoft,
        borderWidth: 1,
        borderColor: colors.warn,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name="clock" size={16} color={colors.warn} />
      <Text style={{ flex: 1, fontSize: 12.5, color: colors.text2, lineHeight: 17 }}>
        Pending approval. You can publish once your account is verified.
      </Text>
    </Pressable>
  );
}

/** Dismissible one-time hint that swipe/long-press manage a campaign. */
function SwipeHint({ colors, onDismiss }: { colors: Colors; onDismiss: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.accentSoft,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 14,
      }}
    >
      <Icon name="edit" size={15} color={colors.accent} strokeWidth={1.9} />
      <Text style={{ flex: 1, fontSize: 12.5, color: colors.text2, lineHeight: 17 }}>
        Swipe left on a campaign to edit or manage it. Long-press for more options.
      </Text>
      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss hint"
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <Icon name="x" size={16} color={colors.text3} />
      </Pressable>
    </View>
  );
}
