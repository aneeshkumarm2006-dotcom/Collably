/**
 * Explore tab (PRD §7.3, §13, §8.6) — the CREATOR campaign discovery page,
 * restyled to the premium "Local Creator Crew" design: a hero header, a stats card, a
 * search pill + filter, category chips, a "Nearby Campaigns" map strip, a
 * featured hero card, and the paginated "Recommended For You" feed (infinite
 * scroll + pull-to-refresh) driving `GET /api/campaigns`.
 *
 * Tapping the Nearby strip (or its "View all") switches to the full interactive
 * map (`ExploreMap`), which also honors the `view=map` deep-link param. The
 * search / filter / sort / pagination / guest logic is unchanged — only the UI
 * around it is new.
 *
 * Reachable in guest mode (read-only): guests can browse and open a campaign, but
 * the "Recommended for you" sort and the bell are hidden, and applying prompts a
 * login on the detail screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NotificationBell } from '@/components/shared';
import {
  CampaignCard,
  FilterBottomSheet,
  SortBottomSheet,
  ExploreMap,
  ExploreHeader,
  StatsRow,
  SearchPill,
  CategoryChips,
  FeaturedCard,
  type ExploreStat,
} from '@/components/campaign';
import { SectionHead } from '@/components/home';
import {
  type CampaignFilters,
  type CampaignSort,
  countActiveFilters,
  buildCampaignQuery,
} from '@/components/campaign/filterTypes';
import { Pressable } from '@/components/ui/SafePressable';
import {
  Icon,
  Avatar,
  EmptyState,
  ErrorState,
  SkeletonCard,
  type BottomSheetRef,
} from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { api, isApiError } from '@/lib/api';
import { formatCompactNumber, formatMoneyCompact } from '@/lib/utils';
import type { Campaign, BusinessProfile } from '@/types';
import type { Category } from '@/constants';

type CampaignWithBusiness = Campaign & { business?: BusinessProfile };
type CampaignPage = {
  data: CampaignWithBusiness[];
  page: number;
  totalPages: number;
  total: number;
};

const PAGE_SIZE = 10;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function ExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The bottom tab bar overlays the screen, so the map's floating overlays (card
  // carousel, recenter FAB) must clear the FULL tab-bar height — not just the
  // home-indicator inset — or their lower half hides behind the bar.
  const tabBarHeight = useBottomTabBarHeight();
  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<CampaignFilters>({});
  const [sort, setSort] = useState<CampaignSort>(isGuest ? 'recent' : 'relevance');

  // Deep-link params: `category` pre-applies a filter; `view=map` opens straight
  // into the map (so the Home "Nearby Campaigns" map preview lands on the map,
  // not the list).
  const { category: categoryParam, view: viewParam } = useLocalSearchParams<{
    category?: string;
    view?: string;
  }>();
  const [viewMode, setViewMode] = useState<'list' | 'map'>(viewParam === 'map' ? 'map' : 'list');

  useEffect(() => {
    if (categoryParam) setFilters((f) => ({ ...f, category: categoryParam as Category }));
  }, [categoryParam]);
  // Honor a later `view=map` navigation (e.g. re-tapping the map preview while the
  // Explore tab is already mounted).
  useEffect(() => {
    if (viewParam === 'map') setViewMode('map');
  }, [viewParam]);

  const [items, setItems] = useState<CampaignWithBusiness[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterRef = useRef<BottomSheetRef>(null);
  const sortRef = useRef<BottomSheetRef>(null);

  // Debounce the search box so each keystroke doesn't fire a request.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (nextPage: number) => {
      const params = buildCampaignQuery({
        filters,
        sort,
        search: debouncedSearch,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      const { data } = await api.get<CampaignPage>('/campaigns', { params });
      return data;
    },
    [filters, sort, debouncedSearch],
  );

  // Initial load + reload whenever the query (filters/sort/search) changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPage(1)
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch((err) => {
        if (!cancelled) setError(isApiError(err) ? err.message : 'Could not load campaigns.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    fetchPage(1)
      .then((res) => {
        setItems(res.data);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch((err) => setError(isApiError(err) ? err.message : 'Could not refresh.'))
      .finally(() => setRefreshing(false));
  }, [fetchPage]);

  const onEndReached = useCallback(() => {
    if (loading || loadingMore || refreshing || page >= totalPages) return;
    setLoadingMore(true);
    fetchPage(page + 1)
      .then((res) => {
        setItems((prev) => [...prev, ...res.data]);
        setPage(res.page);
        setTotalPages(res.totalPages);
      })
      .catch(() => {
        /* keep what we have; a pull-to-refresh can retry */
      })
      .finally(() => setLoadingMore(false));
  }, [fetchPage, loading, loadingMore, refreshing, page, totalPages]);

  const activeFilters = countActiveFilters(filters);

  const openCampaign = useCallback(
    (id: string) => router.push({ pathname: '/(creator)/campaign/[id]', params: { id } }),
    [router],
  );

  // Derived stats (from the loaded page — honest, never invented).
  const stats = useMemo<ExploreStat[]>(() => {
    const availableSum = items.reduce((s, c) => s + (c.reward?.estimatedValue ?? 0), 0);
    const verifiedCount = items.filter((c) => c.business?.isVerified).length;
    const now = Date.now();
    const newCount = items.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return Number.isFinite(t) && now - t <= WEEK_MS;
    }).length;
    return [
      { icon: 'briefcase', value: formatCompactNumber(total), label: 'Campaigns', tone: 'blue' },
      { icon: 'gift', value: formatMoneyCompact(availableSum), label: 'Available', tone: 'green' },
      { icon: 'checkcircle', value: formatCompactNumber(verifiedCount), label: 'Verified Brands', tone: 'blue' },
      { icon: 'zap', value: formatCompactNumber(newCount > 0 ? newCount : total), label: 'New this week', tone: 'blue' },
    ];
  }, [items, total]);

  // The featured hero + the "Recommended" feed (feed excludes the hero to avoid a dupe).
  const featured = useMemo(() => items.find((c) => c.isFeatured) ?? items[0], [items]);
  const recommended = useMemo(
    () => (featured ? items.filter((c) => c._id !== featured._id) : items),
    [items, featured],
  );

  const headerRight = isGuest ? (
    <Pressable onPress={() => router.push('/(creator)/(tabs)/profile')} accessibilityLabel="Profile">
      <Avatar src={user?.avatar} name={user?.name} size={40} />
    </Pressable>
  ) : (
    <>
      <NotificationBell onPress={() => router.push('/(creator)/notifications')} />
      <Pressable onPress={() => router.push('/(creator)/(tabs)/profile')} accessibilityLabel="Profile">
        <Avatar src={user?.avatar} name={user?.name} size={40} />
      </Pressable>
    </>
  );

  // ── Full interactive map view ──
  if (viewMode === 'map') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Pressable
            onPress={() => setViewMode('list')}
            accessibilityLabel="Back to list"
            hitSlop={8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.hair,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevL" size={20} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>
            Nearby Campaigns
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setViewMode('list')}
            accessibilityLabel="Show list"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.hair,
            }}
          >
            <Icon name="list" size={16} color={colors.accent} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>List</Text>
          </Pressable>
        </View>
        {error ? (
          <ErrorState body={error} onRetry={onRefresh} />
        ) : (
          <ExploreMap
            items={items}
            total={total}
            bottomInset={tabBarHeight}
            fitToResults={Boolean(debouncedSearch) || activeFilters > 0}
            onOpen={openCampaign}
            onSearchArea={onRefresh}
          />
        )}
        <FilterBottomSheet ref={filterRef} value={filters} onApply={setFilters} />
        <SortBottomSheet ref={sortRef} value={sort} onChange={setSort} allowRelevance={!isGuest} />
      </View>
    );
  }

  // ── Scrollable discovery page ──
  const ready = !loading && !error && items.length > 0;

  const ListHeader = (
    <View>
      <ExploreHeader name={user?.name} right={headerRight} />
      <StatsRow stats={stats} />
      <SearchPill
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        onFilter={() => filterRef.current?.present()}
        activeFilters={activeFilters}
      />
      <CategoryChips active={filters.category} onSelect={(c) => setFilters((f) => ({ ...f, category: c }))} />

      {ready ? (
        <>
          {/* Nearby Campaigns — a tappable map strip that opens the full map. */}
          <View style={{ marginTop: 26 }}>
            <SectionHead action="View all" onAction={() => setViewMode('map')}>
              Nearby Campaigns
            </SectionHead>
            <View
              style={{
                marginHorizontal: 20,
                height: 180,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.hair,
              }}
            >
              <ExploreMap
                items={items}
                total={total}
                onOpen={openCampaign}
                preview
                onPressPreview={() => setViewMode('map')}
              />
            </View>
          </View>

          {/* Featured Campaigns. */}
          {featured ? (
            <View style={{ marginTop: 28 }}>
              <SectionHead action="View all" onAction={onRefresh}>
                Featured Campaigns
              </SectionHead>
              <FeaturedCard
                campaign={featured}
                businessName={featured.business?.businessName}
                isVerified={featured.business?.isVerified}
                onPress={() => openCampaign(featured._id)}
                onApply={() => openCampaign(featured._id)}
              />
            </View>
          ) : null}

          {/* Recommended For You — heading; the feed items render below. */}
          {recommended.length > 0 ? (
            <View style={{ marginTop: 28, marginBottom: 4 }}>
              <SectionHead>Recommended For You</SectionHead>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <FlatList
        data={ready ? recommended : []}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 20 }}>
            <CampaignCard
              campaign={item}
              businessName={item.business?.businessName}
              onPress={() => openCampaign(item._id)}
            />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{
          paddingBottom: insets.bottom + tabBarHeight + 24,
          gap: 14,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: 20, gap: 14, paddingTop: 20 }}>
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          ) : error ? (
            <ErrorState body={error} onRetry={onRefresh} />
          ) : (
            <EmptyState
              icon="compass"
              title="No campaigns found"
              body={
                activeFilters > 0 || debouncedSearch
                  ? 'Try clearing some filters or searching for something else.'
                  : 'Check back soon — new campaigns are added all the time.'
              }
              action={activeFilters > 0 ? 'Clear filters' : undefined}
              onAction={activeFilters > 0 ? () => setFilters({}) : undefined}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
              <SkeletonCard />
            </View>
          ) : null
        }
      />

      <FilterBottomSheet ref={filterRef} value={filters} onApply={setFilters} />
      <SortBottomSheet ref={sortRef} value={sort} onChange={setSort} allowRelevance={!isGuest} />
    </View>
  );
}
