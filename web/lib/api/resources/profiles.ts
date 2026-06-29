/**
 * Profile endpoints (PRD §7.2) — the caller's own business/creator profile
 * (read + upsert, the latter completing onboarding) and public profile lookups
 * by id. Maps 1:1 to `backend/src/routes/profiles.ts`.
 */
import type { CreatorProfile } from '@/lib/shared';
import type { HttpClient } from '../types';
import type {
  BusinessProfileResponse,
  CreatorProfileResponse,
  PublicBusinessProfileResponse,
  PublicCreatorProfileResponse,
} from '../types';

/** Business profile upsert body (see `businessProfileSchema` on the backend). */
export interface BusinessProfileInput {
  businessName: string;
  description?: string;
  category: string;
  location?: { city?: string; state?: string; country?: string };
  website?: string;
  socialLinks?: { instagram?: string; youtube?: string; tiktok?: string };
  logo?: string | null;
}

/** Creator profile upsert body (see `creatorProfileSchema` on the backend). */
export interface CreatorProfileInput {
  bio?: string;
  niche?: string[];
  location?: { city?: string; state?: string; country?: string };
  socialHandles: CreatorProfile['socialHandles'];
  contentTypes?: string[];
  portfolio?: Array<{ imageUrl: string; caption?: string; link?: string }>;
  isUGCOnly?: boolean;
}

export function createProfilesApi(http: HttpClient) {
  return {
    /** GET /profile/business — own business profile (404 until created). */
    getBusiness: (signal?: AbortSignal) =>
      http.get<BusinessProfileResponse>('/profile/business', { signal }),

    /** PUT /profile/business — create or update own business profile. */
    saveBusiness: (input: BusinessProfileInput) =>
      http.put<BusinessProfileResponse>('/profile/business', input),

    /** GET /profile/creator — own creator profile (404 until created). */
    getCreator: (signal?: AbortSignal) =>
      http.get<CreatorProfileResponse>('/profile/creator', { signal }),

    /** PUT /profile/creator — create or update own creator profile. */
    saveCreator: (input: CreatorProfileInput) =>
      http.put<CreatorProfileResponse>('/profile/creator', input),

    /** GET /profile/creator/:id — public creator profile by CreatorProfile id. */
    getPublicCreator: (id: string, signal?: AbortSignal) =>
      http.get<PublicCreatorProfileResponse>(`/profile/creator/${id}`, { signal }),

    /** GET /profile/business/:id — public business profile by BusinessProfile id. */
    getPublicBusiness: (id: string, signal?: AbortSignal) =>
      http.get<PublicBusinessProfileResponse>(`/profile/business/${id}`, { signal }),
  };
}

export type ProfilesApi = ReturnType<typeof createProfilesApi>;
