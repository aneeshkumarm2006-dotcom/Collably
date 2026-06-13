/**
 * Collab history (PRD §7.3). An archive of completed collabs with a "View post"
 * shortcut that opens the submitted content in the in-app browser. Read-only — the
 * active pipeline lives in the Collabs tab.
 */
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Header } from '@/components/shared';
import { ApplicationCard } from '@/components/creator';
import { Button, EmptyState, ErrorState, SkeletonCard } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import type { Application, Campaign, BusinessProfile } from '@/types';

type AppWithRefs = Application & { campaign?: Campaign & { business?: BusinessProfile } };

const FALLBACK_CAMPAIGN = {
  title: 'Campaign',
  category: 'Other',
  coverImage: null,
  reward: { type: 'Product', description: 'Reward' },
  deadline: '',
} as Pick<Campaign, 'title' | 'category' | 'coverImage' | 'reward' | 'deadline'>;

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: res } = await api.get<{ data: AppWithRefs[] }>('/applications', {
      params: { status: 'Completed', limit: 50 },
    });
    return res.data;
  }, []);

  const items = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="History" onBack={() => router.back()} variant="card" />

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
          renderItem={({ item }) => (
            <ApplicationCard
              application={item}
              campaign={item.campaign ?? FALLBACK_CAMPAIGN}
              businessName={item.campaign?.business?.businessName}
              onPress={() =>
                router.push({ pathname: '/(creator)/collabs/[applicationId]', params: { applicationId: item._id } })
              }
              footer={
                item.submissionLink ? (
                  <Button
                    block
                    variant="outline"
                    size="sm"
                    icon="arrowUR"
                    onPress={() => void WebBrowser.openBrowserAsync(item.submissionLink!)}
                  >
                    View post
                  </Button>
                ) : undefined
              }
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="checkcircle"
              title="No completed collabs yet"
              body="Once a brand verifies your submission, the collab is archived here."
            />
          }
        />
      )}
    </View>
  );
}
