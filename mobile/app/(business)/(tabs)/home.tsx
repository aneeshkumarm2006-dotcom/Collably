/**
 * Business home (PRD §7.4). A glanceable dashboard: summary stat cards, quick
 * actions, a recent-activity preview, and the active campaigns (compact). Each
 * section deep-links into the fuller screen. Pulls the business profile (lifetime
 * stats), the business's campaigns, recent applications, and recent notifications.
 */
import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, NotificationBell } from '@/components/shared';
import { CampaignCard } from '@/components/campaign';
import { Button, Card, EmptyState, ErrorState, Icon, StatCard, SkeletonCard, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Application, Campaign, BusinessProfile, Notification } from '@/types';

type HomeData = {
  profile: BusinessProfile | null;
  campaigns: Campaign[];
  apps: Application[];
  notifs: Notification[];
};

export default function BusinessHomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data, loading, error, reload } = useFetch<HomeData>(async () => {
    const [campaignsRes, appsRes, notifRes] = await Promise.all([
      api.get<{ data: Campaign[] }>('/campaigns', { params: { mine: 'true', limit: 50 } }),
      api.get<{ data: Application[] }>('/applications', { params: { limit: 50 } }),
      api.get<{ data: Notification[] }>('/notifications', { params: { limit: 3 } }),
    ]);
    let profile: BusinessProfile | null = null;
    try {
      const p = await api.get<{ profile: BusinessProfile }>('/profile/business');
      profile = p.data.profile;
    } catch {
      profile = null;
    }
    return { profile, campaigns: campaignsRes.data.data, apps: appsRes.data.data, notifs: notifRes.data.data };
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const firstName = (user?.name ?? 'there').split(' ')[0];

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title={`Hi, ${firstName}`} large />
        <View style={{ padding: 16, gap: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title={`Hi, ${firstName}`} large />
        <ErrorState body={error} onRetry={reload} />
      </View>
    );
  }

  const campaigns = data?.campaigns ?? [];
  const apps = data?.apps ?? [];
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active');
  const pending = apps.filter((a) => a.status === 'Pending').length;
  const awaitingReview = apps.filter((a) => a.status === 'Accepted' && a.submittedAt).length;
  const completed = data?.profile?.totalCollabsCompleted ?? 0;
  const notifs = data?.notifs ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={`Hi, ${firstName}`}
        large
        right={<NotificationBell onPress={() => router.push('/(business)/notifications')} />}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
      >
        {/* Stats */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: '46%' }}>
            <StatCard icon="briefcase" value={activeCampaigns.length} label="Active campaigns" tone="accent" />
          </View>
          <View style={{ flex: 1, minWidth: '46%' }}>
            <StatCard icon="inbox" value={pending} label="Pending applications" tone="warn" />
          </View>
          <View style={{ flex: 1, minWidth: '46%' }}>
            <StatCard icon="upload" value={awaitingReview} label="To review" tone="accent" />
          </View>
          <View style={{ flex: 1, minWidth: '46%' }}>
            <StatCard icon="checkcircle" value={completed} label="Collabs done" tone="success" />
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <QuickAction icon="plus" label="New campaign" colors={colors} onPress={() => router.push('/(business)/campaigns/new')} />
          <QuickAction icon="inbox" label="Applications" colors={colors} onPress={() => router.push('/(business)/(tabs)/applications')} />
          <QuickAction icon="upload" label="Submissions" colors={colors} onPress={() => router.push('/(business)/submissions')} />
        </View>

        {/* Active campaigns */}
        <Section
          title="Active campaigns"
          actionLabel={campaigns.length ? 'See all' : undefined}
          onAction={() => router.push('/(business)/(tabs)/campaigns')}
          colors={colors}
        >
          {activeCampaigns.length === 0 ? (
            <EmptyState
              icon="briefcase"
              title="No active campaigns"
              body="Post a campaign to start receiving applications."
              action="New campaign"
              onAction={() => router.push('/(business)/campaigns/new')}
              style={{ paddingVertical: 24 }}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {activeCampaigns.slice(0, 3).map((c) => (
                <CampaignCard
                  key={c._id}
                  campaign={c}
                  businessName="Your campaign"
                  compact
                  onPress={() => router.push({ pathname: '/(business)/campaigns/[id]/applications', params: { id: c._id } })}
                />
              ))}
            </View>
          )}
        </Section>

        {/* Recent activity */}
        <Section
          title="Recent activity"
          actionLabel={notifs.length ? 'See all' : undefined}
          onAction={() => router.push('/(business)/notifications')}
          colors={colors}
        >
          {notifs.length === 0 ? (
            <EmptyHint icon="bell" text="No activity yet." colors={colors} />
          ) : (
            <Card padding={0}>
              {notifs.map((n, i) => (
                <View
                  key={n._id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.hair,
                  }}
                >
                  {!n.isRead && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }} />}
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5, color: colors.text }}>
                    {n.message}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.text3 }}>{formatRelativeTime(n.createdAt)}</Text>
                </View>
              ))}
            </Card>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon, label, colors, onPress }: { icon: IconName; label: string; colors: ReturnType<typeof useTheme>['colors']; onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Card onPress={onPress} padding={14} style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <Icon name={icon} size={21} color={colors.accent} />
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text, textAlign: 'center' }}>{label}</Text>
      </Card>
    </View>
  );
}

function Section({
  title,
  actionLabel,
  onAction,
  colors,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>{title}</Text>
        {actionLabel && onAction && (
          <Button variant="ghost" size="sm" iconRight="chevR" onPress={onAction}>
            {actionLabel}
          </Button>
        )}
      </View>
      {children}
    </View>
  );
}

function EmptyHint({ icon, text, colors }: { icon: IconName; text: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.cardSunk, borderRadius: 12, padding: 14 }}>
      <Icon name={icon} size={18} color={colors.text3} />
      <Text style={{ flex: 1, fontSize: 13.5, color: colors.text2 }}>{text}</Text>
    </View>
  );
}
