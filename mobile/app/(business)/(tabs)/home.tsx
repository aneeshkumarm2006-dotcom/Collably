/**
 * Business home (PRD §7.4) — premium "Blinkit" design (the CollabSpace handoff's
 * definitive home). A yellow brand header with the business identity, a green
 * "N WAITING" badge and hook headline, a prominent "Post a new campaign" CTA
 * straddling the seam, 2×2 stat tiles, a "Content waiting on you" review queue,
 * and "Your live campaigns" with green progress bars.
 */
import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HookHeadline,
  INK,
  INK_SOFT,
  Press,
  SectionHead,
  UrgencyBadge,
  YellowHeader,
  YellowIconBtn,
} from '@/components/home';
import { Avatar, Icon, ErrorState, SkeletonCard, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatRelativeTime, formatReward } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Application, Campaign, BusinessProfile, CreatorProfile, Notification, UserSummary } from '@/types';

type AppFull = Application & { creator?: CreatorProfile; creatorUser?: UserSummary | null; campaign?: Campaign };
type HomeData = {
  profile: BusinessProfile | null;
  campaigns: Campaign[];
  apps: AppFull[];
  notifs: Notification[];
};

export default function BusinessHomeScreen() {
  const { colors, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data, loading, error, reload } = useFetch<HomeData>(async () => {
    const [campaignsRes, appsRes, notifRes] = await Promise.all([
      api.get<{ data: Campaign[] }>('/campaigns', { params: { mine: 'true', limit: 50 } }),
      api.get<{ data: AppFull[] }>('/applications', { params: { limit: 50 } }),
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

  // The yellow header needs dark status-bar icons in both themes; restore the
  // theme default when leaving so other (paper/dark) screens read correctly.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark', true);
      return () => setStatusBarStyle(isDark ? 'light' : 'dark', true);
    }, [isDark]),
  );

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <YellowHeader pb={26}>
          <HomeTopBarSkeleton />
        </YellowHeader>
        <View style={{ padding: 20, gap: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <YellowHeader pb={26}>
          <HomeTopBarSkeleton />
        </YellowHeader>
        <ErrorState body={error} onRetry={reload} />
      </View>
    );
  }

  const profile = data?.profile ?? null;
  const campaigns = data?.campaigns ?? [];
  const apps = data?.apps ?? [];
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active');
  const applicants = apps.length;
  const toReview = apps.filter((a) => (a.status === 'Accepted' || a.status === 'Overdue') && a.submittedAt);
  const completed = profile?.totalCollabsCompleted ?? 0;

  const name = profile?.businessName ?? user?.name ?? 'Your business';
  const city = profile?.location?.city ?? 'your area';

  const tiles: { icon: IconName; value: string | number; label: string; fg: string; bg: string }[] = [
    { icon: 'briefcase', value: activeCampaigns.length, label: 'Active campaigns', fg: colors.brandGreenText, bg: colors.brandGreenSoft },
    { icon: 'users', value: applicants, label: 'Total applicants', fg: '#D9601F', bg: colors.warnSoft },
    { icon: 'inbox', value: toReview.length, label: 'To review', fg: '#2E7CC2', bg: colors.accentSoft },
    { icon: 'checkcircle', value: completed, label: 'Collabs done', fg: colors.success, bg: colors.successSoft },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brandGreen} />}
      >
        {/* ── Yellow brand header ── */}
        <YellowHeader pb={26}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Press onPress={() => router.push('/(business)/(tabs)/profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <Avatar src={profile?.logo} name={name} size={42} />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16.5, fontWeight: '800', color: INK, letterSpacing: -0.3 }}>{name}</Text>
                  {profile?.isVerified ? <Icon name="badge" size={16} color="#FFFFFF" /> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="mappin" size={12} color={INK_SOFT} />
                  <Text style={{ fontSize: 12.5, color: INK_SOFT, fontWeight: '600' }}>{city}</Text>
                </View>
              </View>
            </Press>
            <YellowIconBtn name="bell" badge onPress={() => router.push('/(business)/notifications')} />
          </View>

          <View style={{ marginTop: 18 }}>
            {toReview.length > 0 ? <UrgencyBadge icon="inbox" label={`${toReview.length} WAITING`} /> : null}
            <HookHeadline>
              {applicants > 0 ? `${applicants} creators want to work with you.` : 'Post a campaign and start collaborating.'}
            </HookHeadline>
          </View>
        </YellowHeader>

        {/* ── Primary CTA straddling the seam ── */}
        <View style={{ paddingHorizontal: 20, marginTop: -24 }}>
          <Press
            onPress={() => router.push('/(business)/campaigns/new')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              backgroundColor: colors.brandGreen,
              borderRadius: 15,
              paddingVertical: 15,
              shadowColor: '#1877F2',
              shadowOpacity: 0.34,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 6,
            }}
          >
            <Icon name="plus" size={20} color="#fff" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 }}>Post a new campaign</Text>
          </Press>
        </View>

        {/* ── Stat tiles ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {tiles.map((tile) => (
            <View
              key={tile.label}
              style={{
                width: '47%',
                flexGrow: 1,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.hair,
                borderRadius: 18,
                padding: 15,
                ...shadows.card,
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tile.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Icon name={tile.icon} size={19} color={tile.fg} />
              </View>
              <Text style={{ fontFamily: 'monospace', fontSize: 23, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>{tile.value}</Text>
              <Text style={{ fontSize: 12, color: colors.text2, marginTop: 1 }}>{tile.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Content waiting on you ── */}
        {toReview.length > 0 ? (
          <View style={{ marginTop: 26 }}>
            <SectionHead icon="inbox" action="Review all" onAction={() => router.push('/(business)/(tabs)/applications')}>
              Content waiting on you
            </SectionHead>
            <View style={{ gap: 11, paddingHorizontal: 20 }}>
              {toReview.slice(0, 4).map((a) => (
                <Press
                  key={a._id}
                  onPress={() => router.push({ pathname: '/(business)/submissions', params: { applicationId: a._id } })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.hair,
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    ...shadows.card,
                  }}
                >
                  <Avatar src={a.creatorUser?.avatar} name={a.creatorUser?.name} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>
                      {a.creatorUser?.name ?? 'Creator'}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text2 }}>
                      {a.campaign?.title ?? 'Campaign'}
                      {a.submittedAt ? ` · ${formatRelativeTime(a.submittedAt)}` : ''}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: colors.brandGreen, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Review</Text>
                  </View>
                </Press>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Your live campaigns ── */}
        <View style={{ marginTop: 26 }}>
          <SectionHead icon="briefcase" action={campaigns.length ? 'All' : undefined} onAction={() => router.push('/(business)/(tabs)/campaigns')}>
            Your live campaigns
          </SectionHead>
          {activeCampaigns.length === 0 ? (
            <View style={{ paddingHorizontal: 20 }}>
              <Press
                onPress={() => router.push('/(business)/campaigns/new')}
                style={{
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.hair,
                  borderRadius: 18,
                  paddingVertical: 28,
                  ...shadows.card,
                }}
              >
                <Icon name="briefcase" size={26} color={colors.text3} />
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.text }}>No active campaigns yet</Text>
                <Text style={{ fontSize: 13, color: colors.text2 }}>Post one to start receiving applications.</Text>
              </Press>
            </View>
          ) : (
            <View style={{ gap: 13, paddingHorizontal: 20 }}>
              {activeCampaigns.map((c) => (
                <BlinkBizCard
                  key={c._id}
                  campaign={c}
                  onPress={() => router.push({ pathname: '/(business)/campaigns/[id]/applications', params: { id: c._id } })}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Premium business campaign card — green progress + applicants + Manage. */
function BlinkBizCard({ campaign, onPress }: { campaign: Campaign; onPress: () => void }) {
  const { colors, shadows } = useTheme();
  const filled = Math.max(0, campaign.spotsTotal - campaign.spotsRemaining);
  const pct = campaign.spotsTotal > 0 ? Math.round((filled / campaign.spotsTotal) * 100) : 0;
  return (
    <Press
      onPress={onPress}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 18,
        padding: 16,
        ...shadows.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 16.5, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
            {campaign.title}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 6,
              marginTop: 7,
              backgroundColor: colors.brandGreenSoft,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
            }}
          >
            <Icon name="gift" size={14} color={colors.brandGreenText} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.brandGreenText }}>{formatReward(campaign.reward)}</Text>
          </View>
        </View>
        <View style={{ backgroundColor: colors.brandGreenSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.brandGreenText }}>Live</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, marginBottom: 7 }}>
        <Text style={{ fontSize: 12, color: colors.text2 }}>
          <Text style={{ color: colors.text, fontFamily: 'monospace', fontWeight: '700' }}>{filled}</Text> of {campaign.spotsTotal} spots filled
        </Text>
        <Text style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: '700', color: colors.brandGreenText }}>{pct}%</Text>
      </View>
      <View style={{ backgroundColor: colors.cardSunk, borderRadius: 6, height: 7, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.brandGreen, borderRadius: 6 }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.hair }}>
        <Icon name="users" size={15} color={colors.text2} />
        <Text style={{ fontSize: 13, color: colors.text2, fontWeight: '600' }}>{campaign.applicationsCount} applicants</Text>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.brandGreenText }}>Manage</Text>
          <Icon name="chevR" size={15} color={colors.brandGreenText} />
        </View>
      </View>
    </Press>
  );
}

function HomeTopBarSkeleton() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(26,27,16,0.12)' }} />
      <View style={{ gap: 6 }}>
        <View style={{ width: 140, height: 16, borderRadius: 8, backgroundColor: 'rgba(26,27,16,0.12)' }} />
        <View style={{ width: 90, height: 12, borderRadius: 6, backgroundColor: 'rgba(26,27,16,0.1)' }} />
      </View>
    </View>
  );
}
