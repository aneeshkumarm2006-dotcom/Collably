/**
 * Content formats a creator produces / a campaign deliverable requires
 * (PRD §5.3 creator profile + §5.4 campaign deliverables, merged).
 */
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
