/**
 * Content formats a creator produces / a campaign deliverable requires
 * (PRD §5.3 creator profile + §5.4 campaign deliverables, merged).
 */
import type { Platform } from './platforms';

export const CONTENT_TYPES = [
  'Reel',
  'Short',
  'Story',
  'Post',
  'Long Video',
  'Review',
  'Photo',
  'UGC',
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const isContentType = (value: string): value is ContentType =>
  (CONTENT_TYPES as readonly string[]).includes(value);

/**
 * Which content formats make sense on each platform — a campaign deliverable's
 * `contentType` must be valid for its `platform` (e.g. "Reel" is Instagram-only,
 * "Short" is YouTube/TikTok). `Any` allows the full set. Enforced in the campaign
 * form (chip options) AND server-side on create/update so a crafted request can't
 * save a nonsensical combo.
 */
export const CONTENT_TYPES_BY_PLATFORM: Record<Platform, readonly ContentType[]> = {
  Instagram: ['Reel', 'Story', 'Post', 'Photo', 'UGC'],
  YouTube: ['Short', 'Long Video', 'Review', 'UGC'],
  TikTok: ['Short', 'Story', 'Review', 'UGC'],
  Google: ['Review', 'Photo', 'Post'],
  Any: CONTENT_TYPES,
};

/** True when `contentType` is a valid deliverable format for `platform`. */
export const isContentTypeForPlatform = (platform: Platform, contentType: ContentType): boolean =>
  CONTENT_TYPES_BY_PLATFORM[platform].includes(contentType);
