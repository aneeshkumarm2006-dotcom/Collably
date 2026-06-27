/**
 * Explore tab (PRD §7.3, §13, §8.6) — the campaign discovery feed. A sticky search
 * bar + Filter/Sort sheets drive `GET /api/campaigns`; results render as the
 * signature `CampaignCard` in a `FlatList` with infinite scroll and pull-to-refresh.
 *
 * Reachable in guest mode (read-only): guests can browse and open a campaign, but
 * the "Recommended for you" sort and the bell are hidden, and applying prompts a
 * login on the detail screen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, NotificationBell } from '@/components/shared';
import {
  CampaignCard,
  FilterBottomSheet,
  SortBottomSheet,
  ExploreMap,
} from '@/components/campaign';
import {
  type CampaignFilters,
  type CampaignSort,
  countActiveFilters,
  buildCampaignQuery,
} from '@/components/campaign/filterTypes';
import {
  Icon,
  Button,
  EmptyState,
  ErrorState,
  SkeletonCard,
  type BottomSheetRef,
} from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { api, isApiError } from '@/lib/api';
import type { Campaign, BusinessProfile } from '@/types';

type CampaignWithBusiness = Campaign & { business?: BusinessProfile };
type CampaignPage = {
  data: CampaignWithBusiness[];
  page: number;
  totalPages: number;
  total: number;
};

const PAGE_SIZE = 10;

export default function ExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isGuest = useAuthStore((s) => s.isGuest);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<CampaignFilters>({});
  const [sort, setSort] = useState<CampaignSort>(isGuest ? 'recent' : 'relevance');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Explore"
        large
        right={
          isGuest ? undefined : (
            <NotificationBell onPress={() => router.push('/(creator)/notifications')} />
          )
        }
      />

      {/* Sticky search + filter row */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.hair,
            borderRadius: 12,
            paddingHorizontal: 12,
          }}
        >
          <Icon name="search" size={18} color={colors.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search campaigns, brands…"
            placeholderTextColor={colors.text3}
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: 11, fontSize: 15.5, color: colors.text }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Icon name="x" size={18} color={colors.text3} />
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Button
            variant={activeFilters > 0 ? 'tonal' : 'outline'}
            size="sm"
            icon="sliders"
            onPress={() => filterRef.current?.present()}
          >
            {activeFilters > 0 ? `Filters · ${activeFilters}` : 'Filters'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon="list"
            onPress={() => sortRef.current?.present()}
          >
            Sort
          </Button>
          {/* spacer pushes the toggle to the right; the count moves to its own
              line below so it never gets squeezed/wrapped on narrow devices. */}
          <View style={{ flex: 1 }} />
          <ViewToggle value={viewMode} onChange={setViewMode} colors={colors} />
        </View>
        {!loading && (
          <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text3, marginTop: 8, marginLeft: 2 }}>
            {total} {total === 1 ? 'result' : 'results'} found
          </Text>
        )}
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16, gap: 14, paddingTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : error ? (
        <ErrorState body={error} onRetry={onRefresh} />
      ) : viewMode === 'map' ? (
        <ExploreMap
          items={items}
          total={total}
          bottomInset={insets.bottom}
          onOpen={(id) => router.push({ pathname: '/(creator)/campaign/[id]', params: { id } })}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <CampaignCard
              campaign={item}
              businessName={item.business?.businessName}
              onPress={() =>
                router.push({ pathname: '/(creator)/campaign/[id]', params: { id: item._id } })
              }
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 24,
            gap: 14,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
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
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingTop: 14 }}>
                <SkeletonCard />
              </View>
            ) : null
          }
        />
      )}

      <FilterBottomSheet ref={filterRef} value={filters} onApply={setFilters} />
      <SortBottomSheet ref={sortRef} value={sort} onChange={setSort} allowRelevance={!isGuest} />
    </View>
  );
}

/** Compact List ⇄ Map segmented control for the Explore header. */
function ViewToggle({
  value,
  onChange,
  colors,
}: {
  value: 'list' | 'map';
  onChange: (v: 'list' | 'map') => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const opt = (mode: 'list' | 'map', icon: 'list' | 'mappin', label: string) => {
    const active = value === mode;
    return (
      <Pressable
        onPress={() => onChange(mode)}
        hitSlop={4}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 11,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: active ? colors.bgElev : 'transparent',
        }}
      >
        <Icon name={icon} size={15} color={active ? colors.accent : colors.text3} />
        <Text
          style={{ fontSize: 13, fontWeight: '700', color: active ? colors.text : colors.text3 }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 11,
        padding: 3,
      }}
    >
      {opt('list', 'list', 'List')}
      {opt('map', 'mappin', 'Map')}
    </View>
  );
}
