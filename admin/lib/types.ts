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
  /** Admin-set (or DM-verified, for Instagram) per-platform trust badge. */
  verified?: boolean;
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
  /** Set when an admin last rejected this creator with a note; cleared on approval. */
  rejectionReason?: string;
  createdAt: string;
  /** Owner account (name + email), attached by the admin list endpoint. */
  user: AdminUser | null;
}

/** A single message in an admin↔creator conversation thread. */
export interface AdminMessage {
  _id: string;
  senderRole: 'admin' | 'creator';
  body: string;
  /** Set when the message carries an image (a Cloudinary secure_url). */
  imageUrl?: string;
  createdAt: string;
}

/** A user-submitted report awaiting admin triage. */
export interface Report {
  _id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  targetType: 'campaign' | 'business' | 'creator' | 'user';
  targetId: string;
  targetLabel: string;
  reason: string;
  status: 'open' | 'dismissed' | 'actioned';
  /** Set when an admin resolves the report (dismiss / action). */
  resolvedAt?: string | null;
  createdAt: string;
}

/**
 * One thread in the admin support inbox (admin↔creator). `creatorProfileId` is
 * the creator profile id used to open the thread; null when the counterpart has
 * no creator profile (thread is not openable).
 */
export interface AdminConversation {
  _id: string;
  creatorProfileId: string | null;
  creatorName: string;
  creatorAvatar?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderUserId: string;
  unread: number;
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
