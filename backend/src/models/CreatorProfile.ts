import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import { NICHES, type Niche } from '../../../shared/constants/niches';
import { CONTENT_TYPES, type ContentType } from '../../../shared/constants/contentTypes';
import { geoLocationSchema } from './common';

/**
 * Creator-side profile, 1:1 with a User of role "creator" (PRD §5.3).
 * Follower/engagement numbers are self-reported in v1 (PRD §15 future scope:
 * automated verification via platform APIs).
 */
export interface CreatorProfileDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  bio?: string;
  niche: Niche[];
  location: { city?: string; state?: string; country?: string };
  socialHandles: {
    instagram?: { handle: string; link: string; followerCount?: number; engagementRate?: number };
    youtube?: { handle: string; link: string; subscriberCount?: number };
    tiktok?: { handle: string; link: string; followerCount?: number };
  };
  contentTypes: ContentType[];
  portfolio: { imageUrl: string; caption?: string; link?: string }[];
  totalCollabsCompleted: number;
  totalRewardsEarned: number;
  isUGCOnly: boolean;
  /**
   * Admin approval flag (parallel to BusinessProfile.isVerified). `false` =
   * pending review; the creator can browse but not apply until verified.
   */
  isVerified: boolean;
  /** Admin moderation flag (PRD §7.5, §14). Suspended profiles are hidden/locked. */
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const portfolioItemSchema = new Schema(
  {
    imageUrl: { type: String, required: true },
    caption: { type: String, trim: true },
    link: { type: String, trim: true },
  },
  { _id: false },
);

const creatorProfileSchema = new Schema<CreatorProfileDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    bio: { type: String, trim: true },
    niche: { type: [{ type: String, enum: [...NICHES] }], default: [] },
    location: { type: geoLocationSchema, default: () => ({}) },
    socialHandles: {
      instagram: {
        handle: { type: String, trim: true },
        link: { type: String, trim: true },
        followerCount: { type: Number, min: 0 },
        engagementRate: { type: Number, min: 0 },
      },
      youtube: {
        handle: { type: String, trim: true },
        link: { type: String, trim: true },
        subscriberCount: { type: Number, min: 0 },
      },
      tiktok: {
        handle: { type: String, trim: true },
        link: { type: String, trim: true },
        followerCount: { type: Number, min: 0 },
      },
    },
    contentTypes: { type: [{ type: String, enum: [...CONTENT_TYPES] }], default: [] },
    portfolio: { type: [portfolioItemSchema], default: [] },
    totalCollabsCompleted: { type: Number, default: 0, min: 0 },
    totalRewardsEarned: { type: Number, default: 0, min: 0 },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const CreatorProfile: Model<CreatorProfileDoc> =
  (models.CreatorProfile as Model<CreatorProfileDoc>) ||
  model<CreatorProfileDoc>('CreatorProfile', creatorProfileSchema);
