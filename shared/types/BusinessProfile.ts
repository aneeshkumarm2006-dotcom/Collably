import type { ID, GeoLocation, Timestamped } from './common';
import type { Category } from '../constants/categories';

export interface BusinessSocialLinks {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

/** Business-side profile, 1:1 with a User of role "business" (PRD §5.2). */
export interface BusinessProfile extends Timestamped {
  _id: ID;
  userId: ID; // ref: User
  businessName: string;
  description?: string;
  category: Category;
  location: GeoLocation;
  website?: string;
  socialLinks: BusinessSocialLinks;
  logo?: string | null;
  isVerified: boolean;
  totalCampaigns: number;
  totalCollabsCompleted: number;
}
