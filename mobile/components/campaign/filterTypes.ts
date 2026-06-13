/**
 * Shared shapes for the campaign discovery filter + sort sheets (PRD §13). These
 * mirror the query params accepted by `GET /api/campaigns`, so a screen can spread
 * the filter object straight into the request.
 */
import type { Category, Platform, RewardType } from '@/constants';

/** Follower buckets from PRD §13 — map to the API's `followersBucket` param. */
export const FOLLOWER_BUCKETS = ['any', 'nano', 'micro', 'mid', 'macro'] as const;
export type FollowerBucket = (typeof FOLLOWER_BUCKETS)[number];

export const FOLLOWER_BUCKET_LABEL: Record<FollowerBucket, string> = {
  any: 'Any size',
  nano: 'Nano · <10K',
  micro: 'Micro · 10–50K',
  mid: 'Mid · 50–200K',
  macro: 'Macro · 200K+',
};

/** Sort options for the explore feed (map to the API `sort` param). */
export const CAMPAIGN_SORTS = ['relevance', 'recent', 'deadline', 'reward'] as const;
export type CampaignSort = (typeof CAMPAIGN_SORTS)[number];

export const CAMPAIGN_SORT_LABEL: Record<CampaignSort, string> = {
  relevance: 'Recommended for you',
  recent: 'Newest first',
  deadline: 'Ending soon',
  reward: 'Highest reward',
};

/** The full discovery filter state. All fields optional → "no filter". */
export type CampaignFilters = {
  category?: Category;
  rewardType?: RewardType;
  platform?: Platform;
  followersBucket?: FollowerBucket;
  /** Only show remote/online campaigns. */
  remoteOnly?: boolean;
};

/** Count active (set) filters — drives the "Filters · N" badge on the chip row. */
export function countActiveFilters(f: CampaignFilters): number {
  return [f.category, f.rewardType, f.platform, f.followersBucket && f.followersBucket !== 'any', f.remoteOnly].filter(
    Boolean,
  ).length;
}

/** Mobile sort key → the `sort` value `GET /api/campaigns` accepts. */
const SORT_PARAM: Record<CampaignSort, string> = {
  relevance: 'relevance',
  recent: 'newest',
  deadline: 'deadline',
  reward: 'reward',
};

/**
 * Build the `GET /api/campaigns` query params from the discovery UI state, so a
 * screen can pass the result straight to `api.get('/campaigns', { params })`.
 * Drops empty values (the backend treats "absent" as "no filter").
 */
export function buildCampaignQuery(opts: {
  filters: CampaignFilters;
  sort: CampaignSort;
  search?: string;
  page?: number;
  limit?: number;
}): Record<string, string | number> {
  const { filters, sort, search, page = 1, limit = 10 } = opts;
  const params: Record<string, string | number> = { sort: SORT_PARAM[sort], page, limit };
  if (filters.category) params.category = filters.category;
  if (filters.rewardType) params.rewardType = filters.rewardType;
  if (filters.platform) params.platform = filters.platform;
  if (filters.followersBucket && filters.followersBucket !== 'any') {
    params.followersBucket = filters.followersBucket;
  }
  if (filters.remoteOnly) params.location = 'remote';
  const q = search?.trim();
  if (q) params.q = q;
  return params;
}
