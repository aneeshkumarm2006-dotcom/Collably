import type { ID, GeoLocation, GeoPoint, ISODateString, Timestamped } from './common';
import type { Category } from '../constants/categories';
import type { Platform } from '../constants/platforms';
import type { ContentType } from '../constants/contentTypes';
import type { RewardType } from '../constants/rewards';
import type { CampaignStatus } from '../constants/statuses';

/**
 * A campaign's location (PRD §5.4 + On-Site Location feature). Extends the coarse
 * city/state/country with an exact pin and a privacy layer:
 *
 * - `coordinates` / `address` / `placeId` are the **exact** values. The API only
 *   ever sends these to viewers authorized to see them (the owning business, an
 *   admin, or a creator whose application was accepted) — see the backend
 *   serializer. `locationPrecise` is `true` in that case.
 * - For everyone else the API sends `approxCoordinates` (a deterministic, fuzzed
 *   point) + `radiusMeters` instead, and **omits** the exact fields entirely, so
 *   an unaccepted creator can never read the precise location off the wire.
 *
 * All map fields are optional: remote campaigns and not-yet-pinned (or
 * map-disabled "coming soon") campaigns simply carry the coarse city only.
 */
export interface CampaignLocation extends GeoLocation {
  /** Exact pin — present only when the viewer is authorized (`locationPrecise`). */
  coordinates?: GeoPoint;
  /** Human-readable street address — same visibility as `coordinates`. */
  address?: string;
  /** Google Place id for the pin (optional; helps re-geocoding). Authorized only. */
  placeId?: string;
  /** Fuzzed point shown to unauthorized viewers (center of the approximate circle). */
  approxCoordinates?: GeoPoint;
  /** Radius (metres) of the approximate circle when `approxCoordinates` is used. */
  radiusMeters?: number;
  /** True when `coordinates`/`address` are the real values (viewer is authorized). */
  locationPrecise?: boolean;
}

export interface CampaignReward {
  type: RewardType;
  description: string;
  estimatedValue?: number;
}

export interface CampaignDeliverable {
  platform: Platform;
  contentType: ContentType;
  quantity: number;
  requirements?: string;
}

/** A collab opportunity posted by a business (PRD §5.4). */
export interface Campaign extends Timestamped {
  _id: ID;
  businessId: ID; // ref: BusinessProfile
  title: string;
  description: string;
  category: Category;
  /** Omitted when `isRemote` is true (PRD §5.4: location | "Remote/Online"). */
  location?: CampaignLocation;
  isRemote: boolean;
  reward: CampaignReward;
  deliverables: CampaignDeliverable[];
  deadline: ISODateString;
  minFollowers: number;
  /** Max creators that can be accepted before the campaign auto-closes. */
  maxCreators: number;
  /** How many creators have been accepted so far. */
  acceptedCount: number;
  /** Derived (server-computed): `maxCreators - acceptedCount`, clamped to ≥ 0. */
  spotsLeft?: number;
  status: CampaignStatus;
  tags: string[];
  coverImage?: string | null;
  applicationsCount: number;
  /** Admin: promoted to the top of the explore feed (PRD §7.5, §13). */
  isFeatured: boolean;
  /** Admin: flagged as spam — hidden from discovery (PRD §7.5, §14). */
  isSpam: boolean;
}
