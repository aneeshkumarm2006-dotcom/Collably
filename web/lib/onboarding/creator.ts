/**
 * Creator-onboarding form model + payload mapping. Framework-neutral (no React)
 * so it stays unit-testable and the form component stays lean. Ported verbatim
 * from `mobile/app/(onboarding)/creator.tsx` so the website and app submit the
 * exact same `PUT /api/profile/creator` body and enforce the same rules
 * (backend: `creatorProfileSchema`).
 *
 * The key rule: a platform only "counts" when it has a handle AND a valid
 * profile link; at least one such platform is required (the backend refines on
 * this), so we guard it client-side too.
 */
import type { CreatorProfile, GeoLocation, Niche, ContentType, PortfolioItem } from '@/lib/shared';
import type { CreatorProfileInput } from '@/lib/api/resources';

export type CreatorForm = {
  bio: string;
  niche: Niche[];
  location: GeoLocation;
  social: {
    igHandle: string;
    igLink: string;
    igFollowers: string;
    igEngagement: string;
    ytHandle: string;
    ytLink: string;
    ytSubs: string;
    ttHandle: string;
    ttLink: string;
    ttFollowers: string;
  };
  contentTypes: ContentType[];
  isUGCOnly: boolean;
  portfolio: PortfolioItem[];
};

export function emptyCreatorForm(): CreatorForm {
  return {
    bio: '',
    niche: [],
    location: {},
    social: {
      igHandle: '',
      igLink: '',
      igFollowers: '',
      igEngagement: '',
      ytHandle: '',
      ytLink: '',
      ytSubs: '',
      ttHandle: '',
      ttLink: '',
      ttFollowers: '',
    },
    contentTypes: [],
    isUGCOnly: false,
    portfolio: [],
  };
}

/** Numeric profile field → input string (empty when unset). */
const numStr = (n: number | undefined): string => (n != null ? String(n) : '');

/**
 * Hydrate the form from an existing profile: the profile-edit page (Phase 7)
 * reuses the onboarding form model + `toCreatorPayload`, so the website submits
 * the same shape whether onboarding or editing.
 */
export function creatorFormFromProfile(profile: CreatorProfile): CreatorForm {
  const s = profile.socialHandles ?? {};
  return {
    bio: profile.bio ?? '',
    niche: [...(profile.niche ?? [])],
    location: { ...(profile.location ?? {}) },
    social: {
      igHandle: s.instagram?.handle ?? '',
      igLink: s.instagram?.link ?? '',
      igFollowers: numStr(s.instagram?.followerCount),
      igEngagement: numStr(s.instagram?.engagementRate),
      ytHandle: s.youtube?.handle ?? '',
      ytLink: s.youtube?.link ?? '',
      ytSubs: numStr(s.youtube?.subscriberCount),
      ttHandle: s.tiktok?.handle ?? '',
      ttLink: s.tiktok?.link ?? '',
      ttFollowers: numStr(s.tiktok?.followerCount),
    },
    contentTypes: [...(profile.contentTypes ?? [])],
    isUGCOnly: profile.isUGCOnly ?? false,
    portfolio: [...(profile.portfolio ?? [])],
  };
}

/** A profile link must look like a real URL (scheme optional), not just any text. */
export const looksLikeUrl = (s: string) =>
  /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i.test(s.trim());

/** Add https:// when the user omitted the scheme, so the backend stores a real URL. */
export const normalizeUrl = (s: string) => {
  const t = s.trim();
  return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t;
};

/** A platform counts only when it has a handle AND a valid profile link. */
export const platformValid = (handle: string, link: string) =>
  Boolean(handle.trim() && looksLikeUrl(link));

/** The user has started a platform (so we can warn if its link is missing/invalid). */
export const platformStarted = (handle: string, link: string) =>
  Boolean(handle.trim() || link.trim());

/** At least one platform with a handle AND a valid profile link is submitted. */
export function hasOneSocial(f: CreatorForm): boolean {
  const s = f.social;
  return (
    platformValid(s.igHandle, s.igLink) ||
    platformValid(s.ytHandle, s.ytLink) ||
    platformValid(s.ttHandle, s.ttLink)
  );
}

/** Strip everything but digits (follower / subscriber counts are integers). */
export const digits = (s: string) => s.replace(/[^0-9]/g, '');

/**
 * Parse a numeric input to a finite number, or `undefined` so the field is
 * omitted entirely: never send NaN/null, which the backend rejects.
 */
export const numOrUndef = (s: string): number | undefined => {
  const t = (s ?? '').trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

/** Map the form to the `PUT /api/profile/creator` body, dropping empty fields. */
export function toCreatorPayload(f: CreatorForm): CreatorProfileInput {
  const trimmedLoc: GeoLocation = {
    ...(f.location.city?.trim() ? { city: f.location.city.trim() } : {}),
    ...(f.location.state?.trim() ? { state: f.location.state.trim() } : {}),
    ...(f.location.country?.trim() ? { country: f.location.country.trim() } : {}),
  };

  const s = f.social;
  const igF = numOrUndef(s.igFollowers);
  const igE = numOrUndef(s.igEngagement);
  const ytS = numOrUndef(s.ytSubs);
  const ttF = numOrUndef(s.ttFollowers);

  // Only include a platform when it's valid (handle + real URL); normalize links.
  const socialHandles = {
    ...(platformValid(s.igHandle, s.igLink)
      ? {
          instagram: {
            handle: s.igHandle.trim(),
            link: normalizeUrl(s.igLink),
            ...(igF !== undefined ? { followerCount: igF } : {}),
            ...(igE !== undefined ? { engagementRate: igE } : {}),
          },
        }
      : {}),
    ...(platformValid(s.ytHandle, s.ytLink)
      ? {
          youtube: {
            handle: s.ytHandle.trim(),
            link: normalizeUrl(s.ytLink),
            ...(ytS !== undefined ? { subscriberCount: ytS } : {}),
          },
        }
      : {}),
    ...(platformValid(s.ttHandle, s.ttLink)
      ? {
          tiktok: {
            handle: s.ttHandle.trim(),
            link: normalizeUrl(s.ttLink),
            ...(ttF !== undefined ? { followerCount: ttF } : {}),
          },
        }
      : {}),
  };

  return {
    ...(f.bio.trim() ? { bio: f.bio.trim() } : {}),
    niche: f.niche,
    ...(Object.keys(trimmedLoc).length ? { location: trimmedLoc } : {}),
    socialHandles,
    ...(f.contentTypes.length ? { contentTypes: f.contentTypes } : {}),
    isUGCOnly: f.isUGCOnly,
    portfolio: f.portfolio,
  };
}

export const MAX_PORTFOLIO = 6;
