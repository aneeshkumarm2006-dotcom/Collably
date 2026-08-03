import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import { NICHES, type Niche } from '../../../shared/constants/niches';
import { CONTENT_TYPES, type ContentType } from '../../../shared/constants/contentTypes';
import { geoLocationSchema } from './common';

/**
 * Creator-side profile, 1:1 with a User of role "creator" (PRD §5.3).
 * Creators do NOT self-report follower/engagement numbers. The only stored
 * count is `instagram.followerCount`, populated by Instagram verification with
 * Meta's real number (and gated on `instagram.verified`).
 */
export interface CreatorProfileDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  bio?: string;
  niche: Niche[];
  location: { city?: string; state?: string; country?: string };
  socialHandles: {
    instagram?: { handle: string; link: string; followerCount?: number; verified?: boolean };
    youtube?: { handle: string; link: string };
    tiktok?: { handle: string; link: string };
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
        // Populated by Instagram verification with Meta's real follower count.
        followerCount: { type: Number, min: 0 },
        verified: { type: Boolean, default: false },
      },
      youtube: {
        handle: { type: String, trim: true },
        link: { type: String, trim: true },
      },
      tiktok: {
        handle: { type: String, trim: true },
        link: { type: String, trim: true },
      },
    },
    contentTypes: { type: [{ type: String, enum: [...CONTENT_TYPES] }], default: [] },
    isUGCOnly: { type: Boolean, default: false },
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
