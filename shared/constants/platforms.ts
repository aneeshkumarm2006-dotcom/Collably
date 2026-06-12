/**
 * Social platforms a campaign deliverable targets (PRD §5.4, §13 filter).
 * "Any" means the creator may choose where to post.
 */
export const PLATFORMS = ['Instagram', 'YouTube', 'TikTok', 'Google', 'Any'] as const;

export type Platform = (typeof PLATFORMS)[number];

export const isPlatform = (value: string): value is Platform =>
  (PLATFORMS as readonly string[]).includes(value);
