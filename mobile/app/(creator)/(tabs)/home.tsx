/**
 * Creator home (PRD §7.3) — premium "Blinkit" design (the CollabSpace handoff's
 * definitive home). An electric-yellow "craving" header with a location pill,
 * a green "N NEW TODAY" badge and a hook headline, a search pill straddling the
 * seam, an earnings card, category quick-tiles, an urgency rail for collabs that
 * need action, a full-bleed featured hero, and a "Fresh for you" feed.
 */
import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoverImage } from '@/components/campaign';
import {
  Avatar,
  Icon,
  ErrorState,
  SkeletonCard,
} from '@/components/ui';
import {
  BrandSearch,
  CATEGORY_ICON,
  categoryTint,
  HookHeadline,
  INK,
  LocationPill,
  Press,
  SectionHead,
  UrgencyBadge,
  YellowHeader,
  YellowIconBtn,
} from '@/components/home';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { daysUntil, formatCompactNumber, formatReward } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { Application, Campaign, BusinessProfile, CreatorProfile, Notification } from '@/types';
import type { Category } from '@/constants';

type AppWithRefs = Application & { campaign?: Campaign & { business?: BusinessProfile } };
type CampaignWithBiz = Campaign & { business?: BusinessProfile };
type HomeData = {
  apps: AppWithRefs[];
  notifs: Notification[];
  profile: CreatorProfile | null;
  campaigns: CampaignWithBiz[];
};

export default function CreatorHomeScreen() {
  const { colors, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const hasUnread = useNotificationStore((s) => s.unreadCount > 0);

  const { data, loading, error, reload } = useFetch<HomeData>(async () => {
    const [appsRes, notifRes, campRes] = await Promise.all([
      api.get<{ data: AppWithRefs[] }>('/applications', { params: { limit: 50 } }),
      api.get<{ data: Notification[] }>('/notifications', { params: { limit: 3 } }),
      api.get<{ data: CampaignWithBiz[] }>('/campaigns', { params: { limit: 12 } }),
    ]);
    let profile: CreatorProfile | null = null;
    try {
      const p = await api.get<{ profile: CreatorProfile }>('/profile/creator');
      profile = p.data.profile;
    } catch {
      profile = null;
    }
    return { apps: appsRes.data.data, notifs: notifRes.data.data, profile, campaigns: campRes.data.data };
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

  const firstName = (user?.name ?? 'there').split(' ')[0];
  const city = data?.profile?.location?.city ?? 'your area';

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <YellowHeader pb={28}>
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
        <YellowHeader pb={28}>
          <HomeTopBarSkeleton />
        </YellowHeader>
        <ErrorState body={error} onRetry={reload} />
      </View>
    );
  }

  const apps = data?.apps ?? [];
  const campaigns = data?.campaigns ?? [];
  const active = apps.filter((a) => a.status === 'Accepted' || a.status === 'Overdue');
  const pending = apps.filter((a) => a.status === 'Pending');
  const completed = data?.profile?.totalCollabsCompleted ?? apps.filter((a) => a.status === 'Completed').length;
  const earned = data?.profile?.totalRewardsEarned ?? 0;

  const hero = campaigns.find((c) => c.isFeatured) ?? campaigns[0];
  const fresh = campaigns.filter((c) => c._id !== hero?._id).slice(0, 5);

  // Category tiles: distinct categories present in the recommended feed, with counts.
  const catCounts = new Map<Category, number>();
  for (const c of campaigns) catCounts.set(c.category, (catCounts.get(c.category) ?? 0) + 1);
  const cats = [...catCounts.entries()].slice(0, 8);

  const goExplore = () => router.push('/(creator)/(tabs)/explore');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brandGreen} />}
      >
        {/* ── Yellow brand header ── */}
        <YellowHeader pb={30}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <LocationPill city={city} onPress={goExplore} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <YellowIconBtn name="bell" badge={hasUnread} onPress={() => router.push('/(creator)/notifications')} />
              <Press onPress={() => router.push('/(creator)/(tabs)/profile')}>
                <Avatar name={user?.name} size={40} />
              </Press>
            </View>
          </View>

          <View style={{ marginTop: 18 }}>
            {campaigns.length > 0 ? <UrgencyBadge icon="zap" label={`${campaigns.length} NEW TODAY`} /> : null}
            <HookHeadline>Fresh collabs matched to your niche, {firstName}.</HookHeadline>
          </View>
        </YellowHeader>

        {/* ── Search pill straddling the seam ── */}
        <View style={{ paddingHorizontal: 20, marginTop: -24 }}>
          <BrandSearch placeholder="Search brands, perks, dining…" onPress={goExplore} />
        </View>

        {/* ── Earnings / quick stats card ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <Press
            onPress={() => router.push('/(creator)/(tabs)/collabs')}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.hair,
              borderRadius: 18,
              padding: 16,
              ...shadows.cardStrong,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  backgroundColor: colors.brandGreenSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="gift" size={23} color={colors.brandGreenText} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 12, color: colors.text2, fontWeight: '600' }}>Rewards earned</Text>
                <Text style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: '700', color: colors.brandGreenText, letterSpacing: -0.8 }}>
                  ${formatCompactNumber(earned)}
                </Text>
              </View>
              <Icon name="chevR" size={20} color={colors.text3} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.hair }}>
              {([[pending.length, 'Applied'], [active.length, 'Active'], [completed, 'Done']] as const).map(([v, l], i) => (
                <View key={l} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.hair }}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.3 }}>{v}</Text>
                  <Text style={{ fontSize: 11, color: colors.text2, marginTop: 1 }}>{l}</Text>
                </View>
              ))}
            </View>
          </Press>
        </View>

        {/* ── Category quick-tiles ── */}
        {cats.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <SectionHead>Browse by category</SectionHead>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 13, paddingHorizontal: 20, paddingBottom: 4 }}
            >
              {cats.map(([cat, count]) => {
                const tint = categoryTint(cat, isDark);
                return (
                  <Press key={cat} onPress={goExplore} style={{ width: 74, alignItems: 'center' }}>
                    <View
                      style={{
                        width: 74,
                        height: 74,
                        borderRadius: 20,
                        backgroundColor: tint.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={CATEGORY_ICON[cat]} size={32} color={tint.fg} />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: colors.text, marginTop: 7, letterSpacing: -0.2 }}>
                      {cat}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.text3, fontFamily: 'monospace' }}>{count}</Text>
                  </Press>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* ── Urgency rail: collabs that need action ── */}
        {active.length > 0 ? (
          <View style={{ marginTop: 26 }}>
            <SectionHead icon="clock" action="All collabs" onAction={() => router.push('/(creator)/(tabs)/collabs')}>
              Finish before the clock runs
            </SectionHead>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 13, paddingHorizontal: 20, paddingBottom: 6 }}
            >
              {active.map((a) => {
                const c = a.campaign;
                const days = c?.deadline ? daysUntil(c.deadline) : 0;
                const urgent = days <= 2;
                return (
                  <Press
                    key={a._id}
                    onPress={() => router.push({ pathname: '/(creator)/collabs/[applicationId]/submit', params: { applicationId: a._id } })}
                    style={{
                      width: 262,
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.hair,
                      borderRadius: 18,
                      padding: 13,
                      ...shadows.card,
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <CoverImage
                        src={c?.coverImage}
                        category={c?.category ?? 'Other'}
                        radius={13}
                        style={{ width: 60, height: 60 }}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 }}>
                          {c?.title ?? 'Collab'}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text2, marginTop: 1 }}>
                          {c?.business?.businessName ?? ''}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignSelf: 'flex-start',
                            gap: 5,
                            marginTop: 7,
                            backgroundColor: urgent ? (isDark ? 'rgba(255,98,87,0.16)' : '#FCEAE3') : colors.cardSunk,
                            paddingHorizontal: 9,
                            paddingVertical: 3,
                            borderRadius: 20,
                          }}
                        >
                          <Icon name="clock" size={13} color={urgent ? colors.danger : colors.text2} />
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: urgent ? colors.danger : colors.text2 }}>
                            {days <= 0 ? 'Due now' : `${days} days left`}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 12,
                        paddingTop: 11,
                        borderTopWidth: 1,
                        borderTopColor: colors.hair,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, marginRight: 10, fontSize: 13, fontWeight: '700', color: colors.brandGreenText }}
                      >
                        {c ? formatReward(c.reward) : 'Perk'}
                      </Text>
                      <View
                        style={{
                          flexShrink: 0,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: colors.brandGreen,
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 20,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Submit</Text>
                        <Icon name="arrowR" size={14} color="#fff" />
                      </View>
                    </View>
                  </Press>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* ── Featured hero (the craving moment) ── */}
        {hero ? (
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <SectionHead icon="sparkles">Featured today</SectionHead>
            <Press
              onPress={() => router.push({ pathname: '/(creator)/campaign/[id]', params: { id: hero._id } })}
              style={{ borderRadius: 22, overflow: 'hidden', ...shadows.cardStrong }}
            >
              <CoverImage src={hero.coverImage} category={hero.category} radius={22} style={{ width: '100%', aspectRatio: 5 / 4 }}>
                <LinearGradient
                  colors={['rgba(8,11,6,0.05)', 'rgba(8,11,6,0.2)', 'rgba(8,11,6,0.9)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: '#1877F2',
                    paddingHorizontal: 11,
                    paddingVertical: 5,
                    borderRadius: 20,
                  }}
                >
                  <Icon name={CATEGORY_ICON[hero.category]} size={13} color={INK} />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: INK }}>{hero.category}</Text>
                </View>
                <View style={{ position: 'absolute', left: 18, right: 18, bottom: 17 }}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.82)', letterSpacing: 0.6, fontWeight: '600' }}>
                    {(hero.business?.businessName ?? 'BRAND').toUpperCase()}
                    {hero.location?.city ? ` · ${hero.location.city.toUpperCase()}` : ''}
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.6, marginTop: 5, lineHeight: 27 }}>
                    {hero.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <View
                      style={{
                        flexShrink: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#1877F2',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 13,
                      }}
                    >
                      <Icon name="gift" size={16} color="#fff" />
                      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, fontWeight: '800', color: '#fff' }}>
                        {formatReward(hero.reward)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexShrink: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        paddingHorizontal: 18,
                        paddingVertical: 9,
                        borderRadius: 13,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1877F2' }}>Apply</Text>
                      <Icon name="arrowR" size={15} color="#1877F2" />
                    </View>
                  </View>
                </View>
              </CoverImage>
            </Press>
          </View>
        ) : null}

        {/* ── Fresh for you (feed) ── */}
        {fresh.length > 0 ? (
          <View style={{ marginTop: 28 }}>
            <SectionHead icon="compass" action="Explore" onAction={goExplore}>
              Fresh for you in {city}
            </SectionHead>
            <View style={{ gap: 12, paddingHorizontal: 20 }}>
              {fresh.map((c) => (
                <BlinkCollabCard
                  key={c._id}
                  campaign={c}
                  onPress={() => router.push({ pathname: '/(creator)/campaign/[id]', params: { id: c._id } })}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Clean Blinkit-style horizontal collab card for the creator feed. */
function BlinkCollabCard({ campaign, onPress }: { campaign: CampaignWithBiz; onPress: () => void }) {
  const { colors, shadows } = useTheme();
  const platform = campaign.deliverables[0]?.platform;
  return (
    <Press
      onPress={onPress}
      style={{
        flexDirection: 'row',
        gap: 13,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 18,
        padding: 11,
        ...shadows.card,
      }}
    >
      <View>
        <CoverImage src={campaign.coverImage} category={campaign.category} radius={14} style={{ width: 92, height: 92 }} />
        <View style={{ position: 'absolute', top: 6, left: 6 }}>
          <Icon name={CATEGORY_ICON[campaign.category]} size={16} color="#fff" />
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 15.5, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
            {campaign.business?.businessName ?? campaign.title}
          </Text>
          {campaign.location?.city ? (
            <Text style={{ fontFamily: 'monospace', fontSize: 10.5, color: colors.text3 }}>{campaign.location.city}</Text>
          ) : null}
        </View>
        <Text numberOfLines={1} style={{ fontSize: 13, color: colors.text2, marginTop: 2 }}>
          {campaign.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 }}>
          {platform ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                borderWidth: 1,
                borderColor: colors.hair,
                borderRadius: 7,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}
            >
              <Icon name={platform === 'YouTube' ? 'youtube' : 'instagram'} size={12} color={colors.text2} />
              <Text style={{ fontSize: 12, color: colors.text2, fontFamily: 'monospace' }}>{platform}</Text>
            </View>
          ) : null}
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.text2, fontFamily: 'monospace' }}>
            {campaign.applicationsCount} applied
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }}>
          <View
            style={{
              flexShrink: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.brandGreenSoft,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
            }}
          >
            <Icon name="gift" size={14} color={colors.brandGreenText} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, fontWeight: '800', color: colors.brandGreenText }}>
              {formatReward(campaign.reward)}
            </Text>
          </View>
          <View
            style={{
              flexShrink: 0,
              backgroundColor: colors.brandGreen,
              paddingHorizontal: 15,
              paddingVertical: 7,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Apply</Text>
          </View>
        </View>
      </View>
    </Press>
  );
}

function HomeTopBarSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ width: 120, height: 18, borderRadius: 9, backgroundColor: 'rgba(26,27,16,0.12)' }} />
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(26,27,16,0.12)' }} />
    </View>
  );
}
