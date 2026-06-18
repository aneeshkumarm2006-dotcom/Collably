/**
 * Collabs tab (PRD §7.3). The creator's active accepted collabs — each with a
 * deadline countdown, status chip, and a Submit / Update CTA. Tapping a card opens
 * the collab detail; completed collabs live in the History screen instead.
 */
import { useCallback } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, NotificationBell } from '@/components/shared';
import { ApplicationCard } from '@/components/creator';
import { Button, EmptyState, ErrorState, SkeletonCard } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { Application, Campaign, BusinessProfile } from '@/types';

type AppWithRefs = Application & { campaign?: Campaign & { business?: BusinessProfile } };

/** Defensive fallback so a missing populated campaign can't crash the card. */
const FALLBACK_CAMPAIGN = {
  title: 'Campaign',
  category: 'Other',
  coverImage: null,
  reward: { type: 'Product', description: 'Reward' },
  deadline: '',
} as Pick<Campaign, 'title' | 'category' | 'coverImage' | 'reward' | 'deadline'>;

export default function CollabsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ data: AppWithRefs[] }>('/applications', {
      params: { status: 'Accepted,Overdue', limit: 50 },
    });
    return res.data;
  }, []);

  // Re-pull when returning from the submit screen so a fresh submission shows.
  useFocusEffect(useCallback(() => reload(), [reload]));

  const items = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Collabs" large right={<NotificationBell onPress={() => router.push('/(creator)/notifications')} />} />

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
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const submitted = !!item.submittedAt;
            return (
              <ApplicationCard
                application={item}
                campaign={item.campaign ?? FALLBACK_CAMPAIGN}
                businessName={item.campaign?.business?.businessName}
                onPress={() =>
                  router.push({ pathname: '/(creator)/collabs/[applicationId]', params: { applicationId: item._id } })
                }
                footer={
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        block
                        variant={submitted ? 'outline' : 'solid'}
                        icon={submitted ? 'edit' : 'upload'}
                        onPress={() =>
                          router.push({
                            pathname: '/(creator)/collabs/[applicationId]/submit',
                            params: { applicationId: item._id },
                          })
                        }
                      >
                        {submitted ? 'Update submission' : 'Submit content'}
                      </Button>
                    </View>
                    {item.conversationId && (
                      <Button
                        variant="tonal"
                        icon="message"
                        onPress={() => router.push(`/(creator)/chat/${item.conversationId}` as Href)}
                      >
                        Message
                      </Button>
                    )}
                  </View>
                }
              />
            );
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="handshake"
              title="No active collabs yet"
              body="When a brand accepts your application, your collab shows up here with its deadline."
              action="Explore campaigns"
              onAction={() => router.push('/(creator)/(tabs)/explore')}
            />
          }
        />
      )}
    </View>
  );
}
