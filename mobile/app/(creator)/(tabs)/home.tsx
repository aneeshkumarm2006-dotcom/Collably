/**
 * Creator home (PRD §7.3). A glanceable dashboard: summary stat cards, quick
 * actions, the active collabs feed, pending applications, and a notifications
 * preview. Each section deep-links into the fuller screen. Pulls the creator
 * profile (for lifetime stats), recent applications, and recent notifications.
 */
import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, NotificationBell } from '@/components/shared';
import { ApplicationCard } from '@/components/creator';
import { Button, Card, ErrorState, Icon, StatCard, SkeletonCard, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCompactNumber, formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Application, Campaign, BusinessProfile, CreatorProfile, Notification } from '@/types';

type AppWithRefs = Application & { campaign?: Campaign & { business?: BusinessProfile } };
type HomeData = { apps: AppWithRefs[]; notifs: Notification[]; profile: CreatorProfile | null };

const FALLBACK_CAMPAIGN = {
  title: 'Campaign',
  category: 'Other',
  coverImage: null,
  reward: { type: 'Product', description: 'Reward' },
  deadline: '',
} as Pick<Campaign, 'title' | 'category' | 'coverImage' | 'reward' | 'deadline'>;

export default function CreatorHomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data, loading, error, reload } = useFetch<HomeData>(async () => {
    const [appsRes, notifRes] = await Promise.all([
      api.get<{ data: AppWithRefs[] }>('/applications', { params: { limit: 50 } }),
      api.get<{ data: Notification[] }>('/notifications', { params: { limit: 3 } }),
    ]);
    let profile: CreatorProfile | null = null;
    try {
      const p = await api.get<{ profile: CreatorProfile }>('/profile/creator');
      profile = p.data.profile;
    } catch {
      profile = null;
    }
    return { apps: appsRes.data.data, notifs: notifRes.data.data, profile };
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

  const apps = data?.apps ?? [];
  const active = apps.filter((a) => a.status === 'Accepted' || a.status === 'Overdue');
  const pending = apps.filter((a) => a.status === 'Pending');
  const completed = data?.profile?.totalCollabsCompleted ?? apps.filter((a) => a.status === 'Completed').length;
  const earned = data?.profile?.totalRewardsEarned ?? 0;
  const notifs = data?.notifs ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={`Hi, ${firstName}`}
        large
        right={<NotificationBell onPress={() => router.push('/(creator)/notifications')} />}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.accent} />}
      >
        {/* Stats */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: '46%' }}>
            <StatCard icon="handshake" value={active.length} label="Active collabs" tone="accent" />
          </View>
          <View style={{ flex: 1, minWidth: '46%' }}>
            <StatCard icon="clock" value={pending.length} label="Pending" tone="warn" />
          </View>
          <View style={{ flex: 1, minWidth: '46%' }}>
            <StatCard icon="checkcircle" value={completed} label="Completed" tone="success" />
          </View>
          <View style={{ flex: 1, minWidth: '46%' }}>
            <StatCard icon="gift" value={`₹${formatCompactNumber(earned)}`} label="Rewards earned" tone="money" />
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <QuickAction icon="compass" label="Explore" colors={colors} onPress={() => router.push('/(creator)/(tabs)/explore')} />
          <QuickAction icon="inbox" label="Applications" colors={colors} onPress={() => router.push('/(creator)/applications')} />
          <QuickAction icon="file" label="History" colors={colors} onPress={() => router.push('/(creator)/history')} />
        </View>

        {/* Active collabs */}
        <Section title="Active collabs" actionLabel={active.length ? 'See all' : undefined} onAction={() => router.push('/(creator)/(tabs)/collabs')} colors={colors}>
          {active.length === 0 ? (
            <EmptyHint icon="handshake" text="No active collabs. Apply to a campaign to get started." colors={colors} />
          ) : (
            <View style={{ gap: 12 }}>
              {active.slice(0, 2).map((a) => (
                <ApplicationCard
                  key={a._id}
                  application={a}
                  campaign={a.campaign ?? FALLBACK_CAMPAIGN}
                  businessName={a.campaign?.business?.businessName}
                  onPress={() =>
                    router.push({ pathname: '/(creator)/collabs/[applicationId]', params: { applicationId: a._id } })
                  }
                />
              ))}
            </View>
          )}
        </Section>

        {/* Pending applications */}
        {pending.length > 0 && (
          <Section title="Pending applications" actionLabel="See all" onAction={() => router.push('/(creator)/applications')} colors={colors}>
            <View style={{ gap: 12 }}>
              {pending.slice(0, 2).map((a) => (
                <ApplicationCard
                  key={a._id}
                  application={a}
                  campaign={a.campaign ?? FALLBACK_CAMPAIGN}
                  businessName={a.campaign?.business?.businessName}
                  onPress={() =>
                    router.push({ pathname: '/(creator)/collabs/[applicationId]', params: { applicationId: a._id } })
                  }
                />
              ))}
            </View>
          </Section>
        )}

        {/* Notifications preview */}
        <Section title="Recent activity" actionLabel={notifs.length ? 'See all' : undefined} onAction={() => router.push('/(creator)/notifications')} colors={colors}>
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
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text }}>{label}</Text>
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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.cardSunk,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <Icon name={icon} size={18} color={colors.text3} />
      <Text style={{ flex: 1, fontSize: 13.5, color: colors.text2 }}>{text}</Text>
    </View>
  );
}
