/**
 * Creator home (PRD §7.3) — the "discover" design: a blue greeting header carrying
 * the creator's level, a search pill straddling the seam, a quick-stats strip, a
 * recommended rail, category chips, a nearby panel, a deadline rail, and a
 * featured banner.
 *
 * Everything renders from real API data. Where the backend genuinely has nothing to
 * say the section is omitted rather than filled with a placeholder — an account
 * with no collabs shows fewer sections, not a wall of zeroes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, ErrorState, Icon, SkeletonCard } from '@/components/ui';
import { PULL_DISTANCE, ScrubRefreshMark, WordReveal } from '@/components/brand';
import {
  BrandSearch,
  CategoryChip,
  DeadlineCard,
  DiscoverSection,
  FeaturedBanner,
  HEADER_INK,
  HEADER_INK_SOFT,
  HeaderStats,
  LevelWell,
  NearbyPanel,
  Press,
  QuickStats,
  RecommendedCard,
  YellowHeader,
  greetingFor,
  levelStateFor,
  matchScore,
} from '@/components/home';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { campaignDistanceKm, useUserLocation } from '@/lib/geo';
import { useVerifyPrompt } from '@/lib/useVerifyPrompt';
import { showToast } from '@/lib/toast';
import { daysUntil } from '@/lib/utils';
import { DURATION, STAGGER_MS } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useIntroStore } from '@/store/introStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { Application, Campaign, BusinessProfile, CreatorProfile } from '@/types';
import type { Category } from '@/constants';

type AppWithRefs = Application & { campaign?: Campaign & { business?: BusinessProfile } };
type CampaignWithBiz = Campaign & { business?: BusinessProfile };
type HomeData = {
  apps: AppWithRefs[];
  profile: CreatorProfile | null;
  campaigns: CampaignWithBiz[];
};

/** A collab counts as "new" if it was posted this last week. */
const NEW_WINDOW_DAYS = 7;
/** The radius the "nearby" panel speaks in. */
const NEARBY_RADIUS_KM = 5;

export default function CreatorHomeScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  // Nudge a new / unverified creator to verify their email (once per launch).
  useVerifyPrompt();

  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const savedIds = useFavoritesStore((s) => s.ids);
  const refreshFavorites = useFavoritesStore((s) => s.refresh);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);

  // Approximate distances need the device's position. A denial is fine — the
  // nearby rows fall back to the city name (see lib/geo).
  const { point: origin } = useUserLocation();

  const [activeCat, setActiveCat] = useState<Category | null>(null);

  // --- Motion -----------------------------------------------------------------

  const reduced = useReducedMotion();

  // The header reveal is once per app launch, NOT once per mount: this screen
  // reloads on every tab focus, so keying it to mount would replay the greeting
  // every single time the user taps Home.
  const introPlayed = useIntroStore((s) => s.homeIntroPlayed);
  const markIntroPlayed = useIntroStore((s) => s.markHomeIntroPlayed);
  const playIntro = !introPlayed && !reduced;

  useEffect(() => {
    if (!introPlayed) markIntroPlayed();
  }, [introPlayed, markIntroPlayed]);

  /** 0 → 1 pull progress. Drives the brand mark behind the header on refresh. */
  const pull = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    // iOS reports overscroll as a negative offset; Android never goes below 0, so
    // there `pull` simply stays at 0 and the mark plays on `refreshing` instead.
    const overscroll = -e.contentOffset.y;
    pull.value = Math.min(Math.max(overscroll / PULL_DISTANCE, 0), 1);
  });

  /** Entrance delay for the Nth header element. */
  const step = (i: number) => (playIntro ? 90 + i * STAGGER_MS : 0);

  const { data, loading, error, reload } = useFetch<HomeData>(async () => {
    // The bell badge reads from useNotificationStore, so home doesn't fetch
    // notifications itself.
    const [appsRes, campRes] = await Promise.all([
      api.get<{ data: AppWithRefs[] }>('/applications', { params: { limit: 50 } }),
      api.get<{ data: CampaignWithBiz[] }>('/campaigns', { params: { limit: 12 } }),
    ]);
    let profile: CreatorProfile | null = null;
    try {
      const p = await api.get<{ profile: CreatorProfile }>('/profile/creator');
      profile = p.data.profile;
    } catch {
      profile = null;
    }
    return { apps: appsRes.data.data, profile, campaigns: campRes.data.data };
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
      refreshFavorites();
    }, [reload, refreshFavorites]),
  );

  // The blue header wants light status-bar icons in both themes; restore the theme
  // default on the way out so the other screens read correctly.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light', true);
      return () => setStatusBarStyle(isDark ? 'light' : 'dark', true);
    }, [isDark]),
  );

  const firstName = (user?.name ?? 'there').split(' ')[0];
  const campaigns = useMemo(() => data?.campaigns ?? [], [data]);
  const apps = useMemo(() => data?.apps ?? [], [data]);

  // --- Derived feed -----------------------------------------------------------

  const active = apps.filter((a) => a.status === 'Accepted' || a.status === 'Overdue');
  const pending = apps.filter((a) => a.status === 'Pending');
  const earned = data?.profile?.totalRewardsEarned ?? 0;

  const hero = campaigns.find((c) => c.isFeatured) ?? campaigns[0];
  const level = levelStateFor(data?.profile ?? null);

  /** Distance (km) to every campaign we can actually place. */
  const distances = useMemo(() => {
    const out = new Map<string, number>();
    if (!origin) return out;
    for (const c of campaigns) {
      const km = campaignDistanceKm(c, origin);
      if (km !== undefined) out.set(c._id, km);
    }
    return out;
  }, [campaigns, origin]);

  /**
   * Nearby: within the radius when we know where the user is, otherwise just the
   * on-site collabs (the honest fallback — we can't claim a radius we can't measure).
   */
  const nearby = useMemo(() => {
    const onSite = campaigns.filter((c) => !c.isRemote);
    if (!origin) return onSite;
    return onSite
      .filter((c) => {
        const km = distances.get(c._id);
        return km !== undefined && km <= NEARBY_RADIUS_KM;
      })
      .sort((a, b) => (distances.get(a._id) ?? 0) - (distances.get(b._id) ?? 0));
  }, [campaigns, distances, origin]);

  const newCollabs = useMemo(() => {
    const cutoff = Date.now() - NEW_WINDOW_DAYS * 86_400_000;
    return campaigns.filter((c) => new Date(c.createdAt).getTime() >= cutoff).length;
  }, [campaigns]);

  const potentialRewards = useMemo(
    () => campaigns.reduce((sum, c) => sum + (c.reward?.estimatedValue ?? 0), 0),
    [campaigns],
  );

  /** Deadlines: accepted work that still needs submitting, most urgent first. */
  const deadlines = useMemo(
    () =>
      active
        .filter((a) => a.campaign?.deadline)
        .map((a) => ({ app: a, days: daysUntil(a.campaign!.deadline) }))
        .sort((x, y) => x.days - y.days),
    [active],
  );
  const dueNow = deadlines.filter((d) => d.days <= 0).length;

  /** Categories present in the feed, most-stocked first. */
  const cats = useMemo(() => {
    const counts = new Map<Category, number>();
    for (const c of campaigns) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [campaigns]);

  /** Recommended: best match first, filtered to the selected category chip. */
  const recommended = useMemo(() => {
    const niche = data?.profile?.niche ?? [];
    const city = data?.profile?.location?.city;
    return campaigns
      .filter((c) => !activeCat || c.category === activeCat)
      .map((c) => ({ c, score: matchScore(c, niche, city) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [campaigns, activeCat, data?.profile]);

  // --- Actions ----------------------------------------------------------------

  const goExplore = () => router.push('/(creator)/(tabs)/explore');
  const goExploreMap = () =>
    router.push({ pathname: '/(creator)/(tabs)/explore', params: { view: 'map' } });
  const openCampaign = (c: CampaignWithBiz) =>
    router.push({ pathname: '/(creator)/campaign/[id]', params: { id: c._id } });

  const onToggleSave = useCallback(
    async (campaignId: string) => {
      try {
        const saved = await toggleFavorite(campaignId);
        showToast(saved ? 'Saved to your collabs' : 'Removed from saved');
      } catch {
        showToast({ message: "Couldn't update your saved collabs", type: 'error' });
      }
    },
    [toggleFavorite],
  );

  // --- Render -----------------------------------------------------------------

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* The refresh mark sits on a brand-coloured plate BEHIND the scroll view, so
          an overscroll pull reveals it on blue rather than on the page background.
          The scroll content is opaque (see contentContainerStyle) — without that,
          this plate shows straight through the content as you scroll. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 240,
          backgroundColor: colors.brandYellow,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: insets.top + 6,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <ScrubRefreshMark pull={pull} refreshing={loading} color={HEADER_INK} bg={colors.brandYellow} />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 96,
          // Opaque: this is what hides the blue plate above during normal scrolling.
          // It only slides away — revealing the plate and the mark — when the user
          // overscrolls at the very top.
          backgroundColor: colors.bg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={reload}
            // iOS: hide the stock spinner — the brand mark IS the indicator here.
            // Android has no negative overscroll to scrub, so it keeps its native one.
            tintColor={Platform.OS === 'ios' ? 'transparent' : colors.brandGreen}
            colors={[colors.brandGreen]}
          />
        }
      >
        {/* ── Blue greeting header ── */}
        <YellowHeader pb={34}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Animated.View entering={playIntro ? FadeIn.delay(step(0)).duration(DURATION.base) : undefined}>
                <Text style={{ fontSize: 14, color: HEADER_INK_SOFT, fontWeight: '600' }}>
                  {greetingFor(new Date())},
                </Text>
              </Animated.View>
              <View style={{ marginTop: 1 }}>
                <WordReveal
                  text={`${firstName} 👋`}
                  animate={playIntro}
                  delay={step(1)}
                  numberOfLines={1}
                  style={{ fontSize: 27, fontWeight: '800', color: HEADER_INK, letterSpacing: -0.7 }}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <NotificationBell
                count={unreadCount}
                onPress={() => router.push('/(creator)/notifications')}
              />
              <Press onPress={() => router.push('/(creator)/(tabs)/profile')}>
                <Avatar name={user?.name} size={40} />
              </Press>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Animated.View entering={playIntro ? FadeIn.delay(step(2)).duration(DURATION.base) : undefined}>
                <Text style={{ fontSize: 13, color: HEADER_INK_SOFT }}>
                  Opportunities are waiting for you!
                </Text>
              </Animated.View>
              <Animated.View entering={playIntro ? FadeInDown.delay(step(3)).duration(DURATION.slow) : undefined}>
                <HeaderStats
                  newCollabs={newCollabs}
                  potentialRewards={potentialRewards}
                  nearby={nearby.length}
                />
              </Animated.View>
            </View>
            <Animated.View entering={playIntro ? FadeInDown.delay(step(4)).duration(DURATION.slow) : undefined}>
              <LevelWell state={level} />
            </Animated.View>
          </View>
        </YellowHeader>

        {/* ── Search pill straddling the seam ── */}
        <Animated.View
          entering={playIntro ? FadeInDown.delay(step(5)).duration(DURATION.slow) : undefined}
          style={{ paddingHorizontal: 20, marginTop: -22 }}
        >
          <BrandSearch placeholder="Search brands, perks, dining…" onPress={goExplore} />
        </Animated.View>

        {/* ── Quick stats ── */}
        <Animated.View entering={playIntro ? FadeInDown.delay(step(6)).duration(DURATION.slow) : undefined}>
          <QuickStats
            earned={earned}
            active={active.length}
            dueNow={dueNow}
            applied={pending.length}
            onPress={() => router.push('/(creator)/(tabs)/collabs')}
          />
        </Animated.View>

        {/* ── Recommended for you ── */}
        {recommended.length > 0 ? (
          <DiscoverSection title="Recommended for you" action="View all" onAction={goExplore}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 6 }}
            >
              {recommended.map(({ c, score }) => (
                <RecommendedCard
                  key={c._id}
                  campaign={c}
                  score={score}
                  saved={savedIds.has(c._id)}
                  onToggleSave={() => onToggleSave(c._id)}
                  onPress={() => openCampaign(c)}
                  onApply={() => openCampaign(c)}
                />
              ))}
            </ScrollView>
          </DiscoverSection>
        ) : null}

        {/* ── Browse by category ── */}
        {cats.length > 0 ? (
          <DiscoverSection title="Browse by category" action="View all" onAction={goExplore}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingBottom: 6 }}
            >
              <AllChip active={activeCat === null} onPress={() => setActiveCat(null)} />
              {cats.map((cat) => (
                <CategoryChip
                  key={cat}
                  category={cat}
                  active={activeCat === cat}
                  onPress={() => setActiveCat(activeCat === cat ? null : cat)}
                />
              ))}
            </ScrollView>
          </DiscoverSection>
        ) : null}

        {/* ── Nearby opportunities ── */}
        <NearbyPanel
          campaigns={nearby}
          distances={distances}
          radiusLabel={
            origin ? `${nearby.length} within ${NEARBY_RADIUS_KM} km` : `${nearby.length} nearby`
          }
          onOpenMap={goExploreMap}
          onOpen={openCampaign}
        />

        {/* ── Deadlines ── */}
        {deadlines.length > 0 ? (
          <DiscoverSection
            title="Deadlines"
            icon="clock"
            action="View all"
            onAction={() => router.push('/(creator)/(tabs)/collabs')}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 11, paddingHorizontal: 20, paddingBottom: 6 }}
            >
              {deadlines.map(({ app, days }) => (
                <DeadlineCard
                  key={app._id}
                  title={app.campaign?.title ?? 'Collab'}
                  subtitle={app.campaign?.business?.businessName ?? ''}
                  cover={app.campaign?.coverImage}
                  category={app.campaign?.category ?? 'Other'}
                  days={days}
                  onSubmit={() =>
                    router.push({
                      pathname: '/(creator)/collabs/[applicationId]/submit',
                      params: { applicationId: app._id },
                    })
                  }
                />
              ))}
            </ScrollView>
          </DiscoverSection>
        ) : null}

        {/* ── Featured ── */}
        {hero ? <FeaturedBanner campaign={hero} onPress={() => openCampaign(hero)} /> : null}
      </Animated.ScrollView>
    </View>
  );
}

/** Bell with a numeric unread badge (the design's "2"). */
function NotificationBell({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="bell" size={22} color={HEADER_INK} />
      {count > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 19,
            height: 19,
            paddingHorizontal: 4,
            borderRadius: 10,
            backgroundColor: '#F5A623',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#1877F2',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      ) : null}
    </Press>
  );
}

/** The "All" category chip — the honest default before any filter is chosen. */
function AllChip({ active, onPress }: { active: boolean; onPress: () => void }) {
  const { colors, shadows } = useTheme();
  return (
    <Press
      onPress={onPress}
      style={{
        width: 74,
        alignItems: 'center',
        gap: 7,
        paddingVertical: 13,
        borderRadius: 16,
        backgroundColor: active ? colors.brandGreen : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.brandGreen : colors.hair,
        ...shadows.card,
      }}
    >
      <Icon name="grid" size={22} color={active ? '#fff' : colors.brandGreenText} strokeWidth={1.9} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : colors.text2 }}>
        All
      </Text>
    </Press>
  );
}

function HomeTopBarSkeleton() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ width: 140, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.28)' }} />
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.28)' }} />
    </View>
  );
}
