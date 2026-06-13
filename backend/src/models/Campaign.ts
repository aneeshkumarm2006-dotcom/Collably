import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import { CATEGORIES, type Category } from '../../../shared/constants/categories';
import { PLATFORMS, type Platform } from '../../../shared/constants/platforms';
import { CONTENT_TYPES, type ContentType } from '../../../shared/constants/contentTypes';
import { REWARD_TYPES, type RewardType } from '../../../shared/constants/rewards';
import { CAMPAIGN_STATUSES, type CampaignStatus } from '../../../shared/constants/statuses';
import { geoLocationSchema } from './common';

/**
 * A collab opportunity posted by a business (PRD §5.4). `spotsRemaining` is
 * decremented as creators are accepted; `status` follows the lifecycle in
 * PRD §12 (enforced server-side in Phase 6).
 */
export interface CampaignDoc extends Document<Types.ObjectId> {
  businessId: Types.ObjectId;
  title: string;
  description: string;
  category: Category;
  location?: { city?: string; state?: string; country?: string };
  isRemote: boolean;
  reward: { type: RewardType; description: string; estimatedValue?: number };
  deliverables: {
    platform: Platform;
    contentType: ContentType;
    quantity: number;
    requirements?: string;
  }[];
  deadline?: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

const deliverableSchema = new Schema(
  {
    platform: { type: String, enum: [...PLATFORMS], required: true },
    contentType: { type: String, enum: [...CONTENT_TYPES], required: true },
    quantity: { type: Number, default: 1, min: 1 },
    requirements: { type: String, trim: true },
  },
  { _id: false },
);

const rewardSchema = new Schema(
  {
    type: { type: String, enum: [...REWARD_TYPES], required: true },
    description: { type: String, required: true, trim: true },
    estimatedValue: { type: Number, min: 0 },
  },
  { _id: false },
);

const campaignSchema = new Schema<CampaignDoc>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: [...CATEGORIES], required: true },
    location: { type: geoLocationSchema, default: undefined },
    isRemote: { type: Boolean, default: false },
    reward: { type: rewardSchema, required: true },
    deliverables: { type: [deliverableSchema], default: [] },
    deadline: { type: Date },
    spotsTotal: { type: Number, required: true, min: 1 },
    spotsRemaining: { type: Number, required: true, min: 0 },
    minFollowers: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: [...CAMPAIGN_STATUSES], default: 'Draft', index: true },
    tags: { type: [String], default: [] },
    coverImage: { type: String, default: null },
    applicationsCount: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isSpam: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Explore-feed discovery query: filter by status + category + location (PRD §13).
campaignSchema.index({ status: 1, category: 1, 'location.city': 1 });
// Tag-based ranking for logged-in creators (PRD §13) + tag filters.
campaignSchema.index({ tags: 1 });

export const Campaign: Model<CampaignDoc> =
  (models.Campaign as Model<CampaignDoc>) || model<CampaignDoc>('Campaign', campaignSchema);
