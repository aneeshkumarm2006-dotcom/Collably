/**
 * Domain constants for the website. The canonical enums (categories, niches,
 * platforms, content types, reward types, statuses) live in the shared package
 * and are re-exported here so a screen has one import site; the web-only pieces
 * below (follower buckets, sort options, status tab groupings) mirror the
 * backend's own definitions verbatim. Keep them in lockstep with
 * `backend/src/routes/campaigns.ts` and the shared status enums.
 */
import {
  CAMPAIGN_STATUSES,
  APPLICATION_STATUSES,
  type CampaignStatus,
  type ApplicationStatus,
} from '@/lib/shared';

// Re-export the canonical enums so callers can do `import { CATEGORIES } from '@/lib/constants'`.
export {
  CATEGORIES,
  NICHES,
  PLATFORMS,
  CONTENT_TYPES,
  REWARD_TYPES,
  USER_ROLES,
  CAMPAIGN_STATUSES,
  APPLICATION_STATUSES,
  CAMPAIGN_STATUS_TRANSITIONS,
  canTransitionCampaign,
  REPORT_TARGET_TYPES,
} from '@/lib/shared';

export type {
  Category,
  Niche,
  Platform,
  ContentType,
  RewardType,
  UserRole,
  CampaignStatus,
  ApplicationStatus,
} from '@/lib/shared';

// --- Follower buckets ---------------------------------------------------------

/**
 * Follower-size filter buckets accepted by `GET /api/campaigns?followersBucket=`.
 * Mirrors `FOLLOWER_BUCKETS` in `backend/src/routes/campaigns.ts`. The first four
 * are the raw ranges; the last four are the audience-size *tiers* surfaced in the
 * FilterSidebar's "creator tier" facet (PRD §13).
 */
export const FOLLOWER_BUCKETS = [
  'under1k',
  '1k-10k',
  '10k-50k',
  '50k+',
  'nano',
  'micro',
  'mid',
  'macro',
] as const;

export type FollowerBucket = (typeof FOLLOWER_BUCKETS)[number];

/** Human labels for each bucket (filter chips). */
export const FOLLOWER_BUCKET_LABELS: Record<FollowerBucket, string> = {
  under1k: 'Under 1K',
  '1k-10k': '1K - 10K',
  '10k-50k': '10K - 50K',
  '50k+': '50K+',
  nano: 'Nano (<10K)',
  micro: 'Micro (10K-50K)',
  mid: 'Mid (50K-200K)',
  macro: 'Macro (200K+)',
};

/** The creator-tier buckets shown in the FilterSidebar (the named tiers only). */
export const CREATOR_TIER_BUCKETS = ['nano', 'micro', 'mid', 'macro'] as const;

// --- Sort options -------------------------------------------------------------

/** Sort values accepted by the campaigns discovery feed (`?sort=`). */
export const CAMPAIGN_SORTS = [
  'relevance',
  'newest',
  'deadline',
  'reward',
  'most_applied',
] as const;

export type CampaignSort = (typeof CAMPAIGN_SORTS)[number];

export const CAMPAIGN_SORT_LABELS: Record<CampaignSort, string> = {
  relevance: 'Best match',
  newest: 'Newest',
  deadline: 'Closing soon',
  reward: 'Highest reward',
  most_applied: 'Most applied',
};

// --- Status tab groupings -----------------------------------------------------

/** Campaign status tabs for the business "My Campaigns" list (PRD §7.4). */
export const CAMPAIGN_STATUS_TABS: ReadonlyArray<'All' | CampaignStatus> = [
  'All',
  ...CAMPAIGN_STATUSES,
];

/**
 * Application status tabs for the creator "My Applications" / business
 * applicant lists. `Cancelled` is folded into the broader views rather than
 * given its own tab.
 */
export const APPLICATION_STATUS_TABS: ReadonlyArray<'All' | ApplicationStatus> = [
  'All',
  ...APPLICATION_STATUSES,
];

/** Upload folders the backend's `POST /api/upload/sign` accepts (Phase 11). */
export const UPLOAD_FOLDERS = [
  'avatars',
  'logos',
  'campaigns',
  'portfolio',
  'submissions',
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];
