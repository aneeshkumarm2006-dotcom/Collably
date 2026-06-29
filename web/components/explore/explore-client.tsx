'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LayoutGrid, Map as MapIcon, Search, SearchX, Sparkles } from 'lucide-react';

import { clientApi } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { CampaignListResponse } from '@/lib/api/types';
import { toCampaignCardData } from '@/lib/campaign-card';
import { CAMPAIGN_SORTS, CAMPAIGN_SORT_LABELS, type CampaignSort } from '@/lib/constants';
import {
  exploreStateKey,
  paramsFromExplore,
  type ExploreState,
} from '@/lib/explore-params';
import {
  FilterSidebar,
  FilterSidebarSheet,
  type CampaignFilters,
} from '@/components/shared/filter-sidebar';
import { CampaignCard } from '@/components/shared/campaign-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_LIMIT = 12;

// Code-split the map: the Google Maps SDK + map component (~heavy) only load when
// the visitor switches to the map view, never on the default grid view.
const CampaignMap = dynamic(
  () => import('@/components/maps/campaign-map').then((m) => m.CampaignMap),
  {
    ssr: false,
    loading: () => <Skeleton className="min-h-[520px] w-full rounded-xl" />,
  },
);

export function ExploreClient({
  initialState,
  initialData,
  isGuest,
  applicationStatusByCampaign,
  personalizedRail,
}: {
  initialState: ExploreState;
  initialData?: CampaignListResponse;
  isGuest: boolean;
  /** Per-campaign application state → corner badge on the card (authed creators). */
  applicationStatusByCampaign?: Record<string, 'applied' | 'accepted' | 'rejected'>;
  /** Optional "matching your niche" rail rendered above the results (authed creators). */
  personalizedRail?: React.ReactNode;
}) {
  const [filters, setFilters] = useState<CampaignFilters>(initialState.filters);
  const [sort, setSort] = useState<CampaignSort>(initialState.sort);
  const [searchDraft, setSearchDraft] = useState(initialState.q);
  const [q, setQ] = useState(initialState.q);
  const [view, setView] = useState<'list' | 'map'>('list');

  // Debounce the search box → committed `q`.
  useEffect(() => {
    const t = setTimeout(() => setQ(searchDraft), 350);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const state: ExploreState = useMemo(() => ({ filters, sort, q }), [filters, sort, q]);
  const params = useMemo(() => paramsFromExplore(state, PAGE_LIMIT), [state]);

  // SSR seed only applies while the live params still match the initial ones.
  const initialKey = useMemo(() => exploreStateKey(initialState), [initialState]);
  const seeded =
    initialData && exploreStateKey(state) === initialKey
      ? { pages: [initialData], pageParams: [1] }
      : undefined;

  const query = useInfiniteQuery({
    queryKey: queryKeys.campaigns.list(params),
    queryFn: ({ pageParam, signal }) => clientApi.campaigns.list({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    initialData: seeded,
  });

  const campaigns = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Map view plots every loaded pin, so eagerly pull the remaining pages while it's open.
  useEffect(() => {
    if (view === 'map' && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [view, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Guests don't get the personalized "Best match" sort.
  const sortOptions = CAMPAIGN_SORTS.filter((s) => !(isGuest && s === 'relevance'));

  return (
    <>
      {/* Search head */}
      <div className="border-b border-hair bg-card">
        <div className="mx-auto max-w-[1320px] px-6 py-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Explore campaigns
          </h1>
          <div className="relative mt-4 max-w-2xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search campaigns, brands, or rewards…"
              className="h-11 pl-11"
              aria-label="Search campaigns"
            />
          </div>
        </div>
      </div>

      {personalizedRail && (
        <div className="mx-auto max-w-[1320px] px-6 pt-6">{personalizedRail}</div>
      )}

      <div className="mx-auto grid max-w-[1320px] gap-8 px-6 py-7 md:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <div className="sticky top-[84px] rounded-lg border border-hair bg-card px-4 pb-3 shadow-sm">
            <FilterSidebar value={filters} onChange={setFilters} />
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FilterSidebarSheet
                value={filters}
                onChange={setFilters}
                triggerClassName="md:hidden"
              />
              <p className="text-sm text-muted">
                {query.isLoading ? (
                  'Loading…'
                ) : (
                  <>
                    <b className="font-mono text-ink">{total}</b>{' '}
                    {total === 1 ? 'campaign' : 'campaigns'} found
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg border border-hair p-0.5" role="group" aria-label="View mode">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  aria-pressed={view === 'list'}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    view === 'list' ? 'bg-brand text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" /> List
                </button>
                <button
                  type="button"
                  onClick={() => setView('map')}
                  aria-pressed={view === 'map'}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    view === 'map' ? 'bg-brand text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  <MapIcon className="h-4 w-4" /> Map
                </button>
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as CampaignSort)}>
                <SelectTrigger className="w-auto min-w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CAMPAIGN_SORT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Guest banner */}
          {isGuest && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft px-5 py-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 shrink-0 text-brand" />
                <p className="text-sm text-ink">
                  <b>Browsing as a guest.</b> Sign up free to apply to campaigns and get matched to
                  your niche.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/signup">Sign up to apply</Link>
              </Button>
            </div>
          )}

          {/* Grid */}
          {query.isLoading ? (
            <CampaignGridSkeleton />
          ) : query.isError ? (
            <EmptyState
              icon={<SearchX />}
              title="Couldn’t load campaigns"
              description="Something went wrong fetching campaigns. Please try again."
              action={
                <Button onClick={() => query.refetch()} variant="outline">
                  Retry
                </Button>
              }
            />
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="No campaigns match your filters"
              description="Try clearing a filter or broadening your search."
            />
          ) : view === 'map' ? (
            <CampaignMap campaigns={campaigns} className="min-h-[520px]" />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {campaigns.map((c) => (
                  <CampaignCard
                    key={c._id}
                    campaign={toCampaignCardData(c, {
                      applicationStatus: applicationStatusByCampaign?.[c._id],
                    })}
                  />
                ))}
              </div>

              {/* Infinite-scroll sentinel + fetching state */}
              <div ref={sentinelRef} className="h-10" aria-hidden />
              {query.isFetchingNextPage && (
                <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  <CampaignGridSkeleton count={3} />
                </div>
              )}
              {!query.hasNextPage && campaigns.length > PAGE_LIMIT && (
                <p className="mt-10 text-center text-sm text-faint">You’ve reached the end.</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function CampaignGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-hair bg-card">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-3 p-[18px]">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
