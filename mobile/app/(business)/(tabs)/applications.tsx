/**
 * Business applications tab (PRD §7.4). Every application across all the business's
 * campaigns in one place, filterable by status. Pending ones carry Accept / Decline;
 * an active collab offers Review submission (once submitted) or Send reminder (while
 * still due). Each row notes which campaign it's for; tapping opens the applicant.
 */
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, NotificationBell } from '@/components/shared';
import { CreatorCard } from '@/components/creator';
import { Button, EmptyState, ErrorState, Icon, SkeletonCard, TagChip } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { ApplicationStatus } from '@/constants';
import type { Application, Campaign, CreatorProfile, UserSummary } from '@/types';

type AppFull = Application & {
  creator?: CreatorProfile;
  creatorUser?: UserSummary | null;
  campaign?: Campaign;
};

const TABS: { key: string; label: string; statuses?: ApplicationStatus[] }[] = [
  { key: 'pending', label: 'Pending', statuses: ['Pending'] },
  { key: 'active', label: 'Active collabs', statuses: ['Accepted', 'Overdue'] },
  { key: 'completed', label: 'Completed', statuses: ['Completed'] },
  { key: 'all', label: 'All' },
];

export default function BusinessApplicationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ data: AppFull[] }>('/applications', { params: { limit: 100 } });
    return res.data;
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const filtered = useMemo(() => {
    const all = data ?? [];
    const active = TABS.find((t) => t.key === tab);
    if (!active?.statuses) return all;
    return all.filter((a) => active.statuses!.includes(a.status));
  }, [data, tab]);

  const decide = async (app: AppFull, status: 'Accepted' | 'Rejected') => {
    const prev = app.status;
    setBusyId(app._id);
    // Optimistic: reflect the decision instantly (the row leaves the Pending tab).
    setData((cur) => cur?.map((a) => (a._id === app._id ? { ...a, status } : a)) ?? cur);
    try {
      await api.patch(`/applications/${app._id}`, { status });
    } catch (err) {
      // Revert on failure. Pure network drops are surfaced by the global toast;
      // a rejected mutation (e.g. campaign full) gets an explanatory alert here.
      setData((cur) => cur?.map((a) => (a._id === app._id ? { ...a, status: prev } : a)) ?? cur);
      if (!isApiError(err) || err.status !== 0) {
        Alert.alert('Could not update', isApiError(err) ? err.message : 'Please try again.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = (app: AppFull, name: string) => {
    Alert.alert('Decline application?', `Decline ${name}'s application? They'll be notified.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => void decide(app, 'Rejected') },
    ]);
  };

  const remind = async (app: AppFull) => {
    setBusyId(app._id);
    try {
      await api.post(`/applications/${app._id}/remind`);
      Alert.alert('Reminder sent', 'We nudged the creator to submit their content.');
    } catch (err) {
      Alert.alert('Could not send', isApiError(err) ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const footerFor = (item: AppFull, name: string) => {
    if (item.status === 'Pending') {
      return (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button block variant="outline" size="sm" icon="x" disabled={busyId === item._id} onPress={() => confirmReject(item, name)}>
              Decline
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button block size="sm" icon="check" loading={busyId === item._id} onPress={() => void decide(item, 'Accepted')}>
              Accept
            </Button>
          </View>
        </View>
      );
    }
    if (item.status === 'Accepted' || item.status === 'Overdue') {
      return item.submittedAt ? (
        <Button block size="sm" icon="eye" onPress={() => router.push({ pathname: '/(business)/submissions', params: { applicationId: item._id } })}>
          Review submission
        </Button>
      ) : (
        <Button block variant="outline" size="sm" icon="bell" loading={busyId === item._id} onPress={() => void remind(item)}>
          Send reminder
        </Button>
      );
    }
    return undefined;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Applications"
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
          renderItem={({ item }) => {
            if (!item.creator) return null;
            const name = item.creatorUser?.name ?? 'Creator';
            return (
              <View style={{ gap: 8 }}>
                {/* which campaign this application is for */}
                <Pressable
                  onPress={() =>
                    item.campaign &&
                    router.push({ pathname: '/(business)/campaigns/[id]/applications', params: { id: item.campaignId } })
                  }
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}
                >
                  <Icon name="briefcase" size={13} color={colors.text3} strokeWidth={1.8} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.text2 }}>
                    {item.campaign?.title ?? 'Campaign'}
                  </Text>
                </Pressable>
                <CreatorCard
                  creator={item.creator}
                  name={name}
                  avatar={item.creatorUser?.avatar}
                  onPress={() => router.push({ pathname: '/(business)/creator/[id]', params: { id: item.creatorId } })}
                  footer={footerFor(item, name)}
                />
              </View>
            );
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="inbox"
              title="No applications here"
              body={
                tab === 'pending'
                  ? 'New applications to your campaigns will show up here.'
                  : 'No applications with this status.'
              }
            />
          }
        />
      )}
    </View>
  );
}
