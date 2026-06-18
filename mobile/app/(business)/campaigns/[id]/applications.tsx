/**
 * Campaign applicants (PRD §7.4, §11). Every application to one campaign, filterable
 * by status. Each applicant is a `CreatorCard`; a pending one carries Accept / Reject
 * buttons (also reachable by swipe). The business approves as many applicants as it
 * wants; the first approval auto-closes the campaign (no new applications) — the
 * header shows how many are approved and whether it's still open. Tapping a card
 * opens the applicant's profile.
 */
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, SwipeableRow, type SwipeAction } from '@/components/shared';
import { CreatorCard } from '@/components/creator';
import { Button, EmptyState, ErrorState, SkeletonCard, TagChip } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { ApplicationStatus } from '@/constants';
import type { Application, Campaign, CreatorProfile, UserSummary } from '@/types';

type AppWithCreator = Application & { creator?: CreatorProfile; creatorUser?: UserSummary | null };

const TABS: { key: string; label: string; statuses?: ApplicationStatus[] }[] = [
  { key: 'pending', label: 'Pending', statuses: ['Pending'] },
  { key: 'accepted', label: 'Accepted', statuses: ['Accepted', 'Overdue', 'Completed'] },
  { key: 'rejected', label: 'Declined', statuses: ['Rejected', 'Withdrawn', 'Cancelled'] },
  { key: 'all', label: 'All' },
];

export default function CampaignApplicantsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const [campaignRes, appsRes] = await Promise.all([
      api.get<{ campaign: Campaign }>(`/campaigns/${id}`),
      api.get<{ data: AppWithCreator[] }>('/applications', { params: { campaignId: id, limit: 100 } }),
    ]);
    return { campaign: campaignRes.data.campaign, apps: appsRes.data.data };
  }, [id]);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const apps = useMemo(() => data?.apps ?? [], [data]);
  const filtered = useMemo(() => {
    const active = TABS.find((t) => t.key === tab);
    if (!active?.statuses) return apps;
    return apps.filter((a) => active.statuses!.includes(a.status));
  }, [apps, tab]);

  const acceptedCount = apps.filter((a) => ['Accepted', 'Overdue', 'Completed'].includes(a.status)).length;

  const decide = async (app: AppWithCreator, status: 'Accepted' | 'Rejected') => {
    const prev = app.status;
    const prevCampaign = data?.campaign;
    setBusyId(app._id);
    // Optimistic: flip the status (tabs + counts react instantly). The first
    // approval auto-closes the campaign, so reflect that in the header too.
    setData((cur) =>
      cur
        ? {
            campaign:
              status === 'Accepted' && cur.campaign.status === 'Active'
                ? { ...cur.campaign, status: 'Closed' }
                : cur.campaign,
            apps: cur.apps.map((a) => (a._id === app._id ? { ...a, status } : a)),
          }
        : cur,
    );
    try {
      await api.patch(`/applications/${app._id}`, { status });
      // Re-sync so the campaign's (server-authoritative) status is accurate.
      void reload();
    } catch (err) {
      // Revert both the application status and the campaign status on failure.
      setData((cur) =>
        cur
          ? {
              campaign: prevCampaign ?? cur.campaign,
              apps: cur.apps.map((a) => (a._id === app._id ? { ...a, status: prev } : a)),
            }
          : cur,
      );
      if (!isApiError(err) || err.status !== 0) {
        Alert.alert('Could not update', isApiError(err) ? err.message : 'Please try again.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = (app: AppWithCreator, name: string) => {
    Alert.alert('Decline application?', `Decline ${name}'s application? They'll be notified.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => void decide(app, 'Rejected') },
    ]);
  };

  const swipeActions = (app: AppWithCreator, name: string): SwipeAction[] => {
    if (app.status !== 'Pending') return [];
    return [
      { key: 'accept', label: 'Accept', icon: 'check', color: colors.accent, onPress: () => void decide(app, 'Accepted') },
      { key: 'reject', label: 'Decline', icon: 'x', color: colors.danger, onPress: () => confirmReject(app, name) },
    ];
  };

  const campaign = data?.campaign;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Applicants"
        subtitle={campaign ? campaign.title : undefined}
        onBack={() => router.back()}
        variant="card"
      />

      {/* Approval status */}
      {campaign && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: colors.bgElev,
            borderBottomWidth: 1,
            borderBottomColor: colors.hair,
          }}
        >
          <Text style={{ fontSize: 13.5, color: colors.text2 }}>
            <Text style={{ fontWeight: '800', color: colors.text }}>{acceptedCount}</Text> approved
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: campaign.status === 'Active' ? colors.accent : colors.text2,
            }}
          >
            {campaign.status === 'Active' ? 'Open to applications' : 'Closed to new applicants'}
          </Text>
        </View>
      )}

      {/* Status tabs */}
      <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair }}>
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
          renderItem={({ item }) => {
            const name = item.creatorUser?.name ?? 'Creator';
            const isPending = item.status === 'Pending';
            const card = item.creator ? (
              <CreatorCard
                creator={item.creator}
                name={name}
                avatar={item.creatorUser?.avatar}
                onPress={() =>
                  router.push({ pathname: '/(business)/creator/[id]', params: { id: item.creatorId } })
                }
                footer={
                  isPending ? (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Button
                          block
                          variant="outline"
                          size="sm"
                          icon="x"
                          disabled={busyId === item._id}
                          onPress={() => confirmReject(item, name)}
                        >
                          Decline
                        </Button>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          block
                          size="sm"
                          icon="check"
                          loading={busyId === item._id}
                          onPress={() => void decide(item, 'Accepted')}
                        >
                          Accept
                        </Button>
                      </View>
                    </View>
                  ) : item.conversationId ? (
                    <Button
                      block
                      variant="tonal"
                      size="sm"
                      icon="message"
                      onPress={() => router.push(`/(business)/chat/${item.conversationId}` as Href)}
                    >
                      Message
                    </Button>
                  ) : undefined
                }
              />
            ) : null;

            if (!card) return null;
            return isPending ? <SwipeableRow actions={swipeActions(item, name)}>{card}</SwipeableRow> : card;
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="users"
              title="No applicants here"
              body={
                tab === 'pending'
                  ? 'No pending applications right now. New applications will appear here.'
                  : 'No applications with this status.'
              }
            />
          }
        />
      )}
    </View>
  );
}
