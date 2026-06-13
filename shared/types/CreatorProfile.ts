import type { ID, GeoLocation, Timestamped } from './common';
import type { Niche } from '../constants/niches';
import type { ContentType } from '../constants/contentTypes';

export interface InstagramHandle {
  handle: string;
  followerCount: number;
  engagementRate?: number;
}

export interface YouTubeHandle {
  handle: string;
  subscriberCount: number;
}

export interface TikTokHandle {
  handle: string;
  followerCount: number;
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
  /** Admin moderation flag (PRD §7.5, §14). */
  isSuspended: boolean;
}
