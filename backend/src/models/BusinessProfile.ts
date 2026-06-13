import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import { CATEGORIES, type Category } from '../../../shared/constants/categories';
import { geoLocationSchema } from './common';

/**
 * Business-side profile, 1:1 with a User of role "business" (PRD §5.2).
 * `userId` is unique so a user can own at most one business profile.
 */
export interface BusinessProfileDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  businessName: string;
  description?: string;
  category: Category;
  location: { city?: string; state?: string; country?: string };
  website?: string;
  socialLinks: { instagram?: string; youtube?: string; tiktok?: string };
  logo?: string | null;
  isVerified: boolean;
  /** Admin moderation flag (PRD §7.5, §14). Suspended profiles are hidden/locked. */
  isSuspended: boolean;
  totalCampaigns: number;
  totalCollabsCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

const businessProfileSchema = new Schema<BusinessProfileDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, enum: [...CATEGORIES], required: true },
    location: { type: geoLocationSchema, default: () => ({}) },
    website: { type: String, trim: true },
    socialLinks: {
      instagram: { type: String, trim: true },
      youtube: { type: String, trim: true },
      tiktok: { type: String, trim: true },
    },
    logo: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    totalCampaigns: { type: Number, default: 0, min: 0 },
    totalCollabsCompleted: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const BusinessProfile: Model<BusinessProfileDoc> =
  (models.BusinessProfile as Model<BusinessProfileDoc>) ||
  model<BusinessProfileDoc>('BusinessProfile', businessProfileSchema);
