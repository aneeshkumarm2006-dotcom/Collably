import type { ID, GeoLocation, ISODateString, Timestamped } from './common';
import type { Category } from '../constants/categories';
import type { Platform } from '../constants/platforms';
import type { ContentType } from '../constants/contentTypes';
import type { RewardType } from '../constants/rewards';
import type { CampaignStatus } from '../constants/statuses';

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
  location?: GeoLocation;
  isRemote: boolean;
  reward: CampaignReward;
  deliverables: CampaignDeliverable[];
  deadline: ISODateString;
  spotsTotal: number;
  spotsRemaining: number;
  minFollowers: number;
  status: CampaignStatus;
  tags: string[];
  coverImage?: string | null;
  applicationsCount: number;
  /** Admin: promoted to the top of the explore feed (PRD §7.5, §13). */
  isFeatured: boolean;
  /** Admin: flagged as spam — hidden from discovery (PRD §7.5, §14). */
  isSpam: boolean;
}
