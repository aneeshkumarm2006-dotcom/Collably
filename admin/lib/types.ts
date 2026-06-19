/**
 * Minimal client-side shapes for the data the dashboard reads from the Collably
 * backend's `/api/admin/*` endpoints. Kept local (rather than importing the
 * monorepo `app/shared` types) so this Next.js app stays self-contained.
 */

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'creator' | 'business' | 'admin';
  avatar?: string | null;
  isVerified: boolean;
  isBanned: boolean;
  createdAt: string;
}

export interface SocialHandle {
  handle: string;
  link: string;
  followerCount?: number;
  subscriberCount?: number;
  engagementRate?: number;
}

export interface GeoLocation {
  city?: string;
  state?: string;
  country?: string;
}

export interface CreatorRow {
  _id: string;
  userId: string;
  bio?: string;
  niche: string[];
  location?: GeoLocation;
  socialHandles: {
    instagram?: SocialHandle;
    youtube?: SocialHandle;
    tiktok?: SocialHandle;
  };
  contentTypes: string[];
  isUGCOnly: boolean;
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  /** Owner account (name + email), attached by the admin list endpoint. */
  user: AdminUser | null;
}

export interface BusinessRow {
  _id: string;
  userId: string;
  businessName: string;
  description?: string;
  category: string;
  location?: GeoLocation;
  website?: string;
  socialLinks: { instagram?: string; youtube?: string; tiktok?: string };
  logo?: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  totalCampaigns: number;
  totalCollabsCompleted: number;
  createdAt: string;
  user: AdminUser | null;
}
