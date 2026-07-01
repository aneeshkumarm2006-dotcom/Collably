/**
 * Translate between the Explore UI state (the `FilterSidebar` filters + sort +
 * search), the URL query string, and the backend `CampaignListParams`. Shared by
 * the server page (initial fetch + state) and the client (live refetch) so both
 * agree on exactly what each filter means.
 */
import type { CampaignFilters } from '@/components/shared/filter-sidebar';
import { defaultCampaignFilters } from '@/components/shared/filter-sidebar';
import type { CampaignListParams } from '@/lib/api/types';
import type { CampaignSort, FollowerBucket } from '@/lib/constants';
import { CAMPAIGN_SORTS } from '@/lib/constants';

export interface ExploreState {
  filters: CampaignFilters;
  sort: CampaignSort;
  q: string;
}

/** Creator-tier label (FilterSidebar) → backend follower bucket. */
const TIER_TO_BUCKET: Record<string, FollowerBucket | undefined> = {
  'Open to all': undefined,
  'Nano (1K-10K)': 'nano',
  'Micro (10K-50K)': 'micro',
  'Mid (50K+)': 'mid',
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function csv(v: string | string[] | undefined): string[] {
  const s = first(v);
  return s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [];
}

/** Build the initial Explore state from URL search params (e.g. `?category=Beauty&q=glow`). */
export function exploreStateFromSearchParams(sp: RawParams): ExploreState {
  const sortParam = first(sp.sort);
  const sort = (CAMPAIGN_SORTS as readonly string[]).includes(sortParam ?? '')
    ? (sortParam as CampaignSort)
    : 'newest';

  return {
    filters: {
      ...defaultCampaignFilters,
      categories: csv(sp.category),
      rewardTypes: csv(sp.rewardType),
      platforms: csv(sp.platform),
      location: first(sp.location) ?? '',
      remoteOnly: first(sp.remote) === 'true',
      creatorTier: first(sp.tier) ?? 'Open to all',
    },
    sort,
    q: first(sp.q) ?? '',
  };
}

/** Build backend list params from Explore state. */
export function paramsFromExplore(state: ExploreState, limit = 12): CampaignListParams {
  const { filters, sort, q } = state;
  const params: CampaignListParams = { sort, limit };
  if (q.trim()) params.q = q.trim();
  if (filters.categories.length) params.category = filters.categories;
  if (filters.rewardTypes.length) params.rewardType = filters.rewardTypes;
  // The API takes a single platform; send the first selected.
  if (filters.platforms.length) params.platform = filters.platforms[0];
  if (filters.remoteOnly) params.location = 'remote';
  else if (filters.location.trim()) params.location = filters.location.trim();
  const bucket = TIER_TO_BUCKET[filters.creatorTier];
  if (bucket) params.followersBucket = bucket;
  return params;
}

/** Stable key for an Explore state (so SSR seed data is only reused for matching params). */
export function exploreStateKey(state: ExploreState): string {
  return JSON.stringify(paramsFromExplore(state));
}
