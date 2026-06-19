import type { ID, GeoLocation, Timestamped } from './common';
import type { Niche } from '../constants/niches';
import type { ContentType } from '../constants/contentTypes';

export interface InstagramHandle {
  handle: string;
  /** Public profile URL (e.g. https://instagram.com/yourhandle). Required when the platform is submitted. */
  link: string;
  followerCount?: number;
  engagementRate?: number;
}

export interface YouTubeHandle {
  handle: string;
  /** Public channel URL. Required when the platform is submitted. */
  link: string;
  subscriberCount?: number;
}

export interface TikTokHandle {
  handle: string;
  /** Public profile URL. Required when the platform is submitted. */
  link: string;
  followerCount?: number;
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
}
