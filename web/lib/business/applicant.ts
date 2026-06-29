/**
 * Derive the business-facing view of an applicant from a `PublicApplication`
 * (Phase 8). The applicant lists/cards need the creator's display name (on the
 * joined `creatorUser`), a headline social handle + reach (on the joined
 * `creator` profile's `socialHandles`), niche, city, and portfolio — assembled
 * here once so the applications, collabs, and submissions screens stay identical.
 */
import type { PublicApplication } from '@/lib/api/types';
import type { CreatorSocialHandles } from '@/lib/shared';

export interface ApplicantView {
  name: string;
  avatar: string | null;
  /** Headline handle (the largest-audience platform), e.g. "@toronto.eats". */
  handle?: string;
  /** That platform's follower/subscriber count. */
  followers?: number;
  niche: string[];
  city?: string;
  portfolio: string[];
  /** Public creator profile route, when the creator profile was joined. */
  profileHref?: string;
}

/** The platform with the largest audience — the handle a business sees first. */
function headlineHandle(handles: CreatorSocialHandles): { handle: string; count?: number } | null {
  const candidates = [
    handles.instagram && {
      handle: handles.instagram.handle,
      count: handles.instagram.followerCount,
    },
    handles.youtube && { handle: handles.youtube.handle, count: handles.youtube.subscriberCount },
    handles.tiktok && { handle: handles.tiktok.handle, count: handles.tiktok.followerCount },
  ].filter(Boolean) as { handle: string; count?: number }[];
  if (candidates.length === 0) return null;
  return candidates.slice().sort((a, b) => (b.count ?? 0) - (a.count ?? 0))[0];
}

export function applicantView(app: PublicApplication): ApplicantView {
  const creator = app.creator;
  const user = app.creatorUser;
  const handles = creator?.socialHandles ?? {};
  const headline = headlineHandle(handles);

  return {
    name: user?.name ?? 'Creator',
    avatar: user?.avatar ?? null,
    handle: headline ? `@${headline.handle.replace(/^@/, '')}` : undefined,
    followers: headline?.count,
    niche: creator?.niche ?? [],
    city: creator?.location?.city,
    portfolio: (creator?.portfolio ?? []).map((p) => p.imageUrl),
    profileHref: creator ? `/creator/${creator._id}` : undefined,
  };
}
