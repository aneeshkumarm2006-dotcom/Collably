/**
 * Applications (PRD §7.3, §11). Every application the creator has filed, filterable
 * by status chips. A pending application can be withdrawn (long-press → confirm),
 * and an accepted one offers a Submit CTA. Tapping a card opens the collab detail.
 */
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { ApplicationCard } from '@/components/creator';
import { Button, EmptyState, ErrorState, SkeletonCard, TagChip } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api, isApiError } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { ApplicationStatus } from '@/constants';
import type { Application, Campaign, BusinessProfile } from '@/types';

type AppWithRefs = Application & { campaign?: Campaign & { business?: BusinessProfile } };

const TABS: { key: string; label: string; statuses?: ApplicationStatus[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending', statuses: ['Pending'] },
  { key: 'accepted', label: 'Accepted', statuses: ['Accepted', 'Overdue'] },
  { key: 'completed', label: 'Completed', statuses: ['Completed'] },
  { key: 'closed', label: 'Closed', statuses: ['Rejected', 'Withdrawn', 'Cancelled'] },
];

const FALLBACK_CAMPAIGN = {
  title: 'Campaign',
  category: 'Other',
  coverImage: null,
  reward: { type: 'Product', description: 'Reward' },
  deadline: '',
} as Pick<Campaign, 'title' | 'category' | 'coverImage' | 'reward' | 'deadline'>;

export default function ApplicationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('all');

  const { data, setData, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ data: AppWithRefs[] }>('/applications', { params: { limit: 50 } });
    return res.data;
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const filtered = useMemo(() => {
    const all = data ?? [];
    const active = TABS.find((t) => t.key === tab);
    if (!active?.statuses) return all;
    return all.filter((a) => active.statuses!.includes(a.status));
  }, [data, tab]);

  const withdraw = (id: string) => {
    Alert.alert('Withdraw application?', 'This removes your pending application. You can apply again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          // Optimistic: flip to Withdrawn locally, revert on failure.
          setData((prev) => prev?.map((a) => (a._id === id ? { ...a, status: 'Withdrawn' } : a)) ?? prev);
          try {
            await api.post(`/applications/${id}/withdraw`);
          } catch (err) {
            reload();
            Alert.alert('Could not withdraw', isApiError(err) ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="My applications" onBack={() => router.back()} variant="card" />

      {/* Status tabs */}
      <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair, backgroundColor: colors.bgElev }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
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
            <Pressable
              onLongPress={item.status === 'Pending' ? () => withdraw(item._id) : undefined}
              delayLongPress={300}
            >
              <ApplicationCard
                application={item}
                campaign={item.campaign ?? FALLBACK_CAMPAIGN}
                businessName={item.campaign?.business?.businessName}
                onPress={() =>
                  router.push({ pathname: '/(creator)/collabs/[applicationId]', params: { applicationId: item._id } })
                }
                footer={
                  item.status === 'Pending' ? (
                    <Button block variant="outline" size="sm" icon="x" onPress={() => withdraw(item._id)}>
                      Withdraw
                    </Button>
                  ) : item.status === 'Accepted' || item.status === 'Overdue' ? (
                    <Button
                      block
                      size="sm"
                      icon={item.submittedAt ? 'edit' : 'upload'}
                      onPress={() =>
                        router.push({
                          pathname: '/(creator)/collabs/[applicationId]/submit',
                          params: { applicationId: item._id },
                        })
                      }
                    >
                      {item.submittedAt ? 'Update submission' : 'Submit content'}
                    </Button>
                  ) : undefined
                }
              />
            </Pressable>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="inbox"
              title="Nothing here yet"
              body={
                tab === 'all'
                  ? "You haven't applied to any campaigns yet. Explore and find your first collab."
                  : 'No applications with this status.'
              }
              action={tab === 'all' ? 'Explore campaigns' : undefined}
              onAction={tab === 'all' ? () => router.push('/(creator)/(tabs)/explore') : undefined}
            />
          }
        />
      )}
    </View>
  );
}
