import type { ID, GeoLocation, Timestamped } from './common';
import type { Niche } from '../constants/niches';
import type { ContentType } from '../constants/contentTypes';

export interface InstagramHandle {
  handle: string;
  /** Public profile URL (e.g. https://instagram.com/yourhandle). Required when the platform is submitted. */
  link: string;
  /**
   * Meta's real follower count, populated by Instagram verification. Only present
   * (and only trustworthy) when `verified` is true — creators cannot self-report it.
   */
  followerCount?: number;
  /**
   * True once ownership was proven via the DM-code flow. When set, `followerCount`
   * is Meta's number (not self-reported). Verifying does NOT gate anything — it's a
   * trust signal; businesses still set their own per-campaign `minFollowers`.
   */
  verified?: boolean;
}

export interface YouTubeHandle {
  handle: string;
  /** Public channel URL. Required when the platform is submitted. */
  link: string;
  /**
   * True once an admin has reviewed this channel and marked it verified. Unlike
   * Instagram (proven via the DM-code flow), YouTube/TikTok are verified by an
   * admin eyeballing the submitted link. A per-platform trust signal.
   */
  verified?: boolean;
}

export interface TikTokHandle {
  handle: string;
  /** Public profile URL. Required when the platform is submitted. */
  link: string;
  /** True once an admin has reviewed this profile and marked it verified. */
  verified?: boolean;
}

export interface CreatorSocialHandles {
  instagram?: InstagramHandle;
  youtube?: YouTubeHandle;
  tiktok?: TikTokHandle;
}

export interface PortfolioItem {
  imageUrl: string;
  caption?: string;
  link?: string;
}

/** Creator-side profile, 1:1 with a User of role "creator" (PRD §5.3). */
export interface CreatorProfile extends Timestamped {
  _id: ID;
  userId: ID; // ref: User
  bio?: string;
  niche: Niche[];
  location: GeoLocation;
  socialHandles: CreatorSocialHandles;
  contentTypes: ContentType[];
  portfolio: PortfolioItem[];
  totalCollabsCompleted: number;
  totalRewardsEarned: number;
  /** UGC-only creators produce content without a public following (PRD §1.3). */
  isUGCOnly: boolean;
  /**
   * Admin approval flag (parallel to `BusinessProfile.isVerified`). `false` means
   * the creator is pending review ("under review"): they can explore the app but
   * cannot apply to campaigns until an admin verifies them. Distinct from
   * `User.isVerified`, which tracks *email* verification.
   */
  isVerified: boolean;
  /** Admin moderation flag (PRD §7.5, §14). */
  isSuspended: boolean;
  /**
   * The reason an admin last rejected this profile, if any. Set when an admin
   * rejects (declines) the creator with a note; shown back to the creator so they
   * know what to fix, and cleared once they are approved. Empty/undefined = no
   * outstanding rejection.
   */
  rejectionReason?: string;
}
