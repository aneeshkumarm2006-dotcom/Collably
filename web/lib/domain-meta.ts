/**
 * Visual metadata for the domain enums — emoji glyphs (reward / category /
 * niche) and category → cover-gradient fallbacks. Keyed by the SHARED enum
 * values (`@/lib/shared`) so they stay in lockstep with the backend.
 *
 * The "blend": covers fall back to neutral-ink gradients (no colored glow),
 * matching the reference card anatomy re-skinned to the app palette.
 */
import type { Category, Niche, RewardType } from '@/lib/shared';

/** Reward type → emoji (shown small in `RewardPill`). */
export const REWARD_EMOJI: Record<RewardType, string> = {
  Product: '🎁',
  Experience: '✨',
  Voucher: '🎟️',
  Service: '🛎️',
  'Cash+Product': '💰',
};

export const rewardEmoji = (type: RewardType): string => REWARD_EMOJI[type] ?? '🎁';

/** Campaign/business category → emoji (filter chips, `CategoryPill`). */
export const CATEGORY_EMOJI: Record<Category, string> = {
  Restaurant: '🍽️',
  Cafe: '☕',
  'Food & Beverage': '🥤',
  Fashion: '👗',
  Beauty: '💄',
  'Salon & Spa': '💅',
  'Health & Wellness': '🌿',
  Fitness: '🏋️',
  Tech: '📱',
  Gaming: '🎮',
  Travel: '✈️',
  'Home & Lifestyle': '🛋️',
  Education: '📚',
  Other: '🏷️',
};

export const categoryEmoji = (category: string): string =>
  CATEGORY_EMOJI[category as Category] ?? '🏷️';

/** Creator niche → emoji (onboarding pills, creator profiles). */
export const NICHE_EMOJI: Record<Niche, string> = {
  Food: '🍜',
  Lifestyle: '🌸',
  Fashion: '👗',
  Beauty: '💄',
  Fitness: '🏋️',
  'Health & Wellness': '🌿',
  Tech: '📱',
  Gaming: '🎮',
  Travel: '✈️',
  Parenting: '🍼',
  Education: '📚',
  Comedy: '😂',
  Music: '🎵',
  'Art & Design': '🎨',
  'Business & Finance': '📈',
};

export const nicheEmoji = (niche: string): string => NICHE_EMOJI[niche as Niche] ?? '✨';

/**
 * Category → 2-stop cover gradient fallback (used when a campaign has no cover
 * image, or it fails to load). Neutral-ink tones tuned per category family.
 */
const CATEGORY_GRADIENT: Record<Category, [string, string]> = {
  Restaurant: ['#1e2747', '#33406b'],
  Cafe: ['#3a2c1e', '#5e4a32'],
  'Food & Beverage': ['#1b2c3a', '#33506b'],
  Fashion: ['#262a52', '#444a85'],
  Beauty: ['#3a2350', '#5a3f7a'],
  'Salon & Spa': ['#2a2350', '#4a3f7a'],
  'Health & Wellness': ['#16302a', '#274f47'],
  Fitness: ['#172a3a', '#2d4f6b'],
  Tech: ['#16233a', '#274a6b'],
  Gaming: ['#241a3a', '#3f2d6b'],
  Travel: ['#142a3a', '#2d556b'],
  'Home & Lifestyle': ['#2a2620', '#4a4338'],
  Education: ['#1e2747', '#33406b'],
  Other: ['#222a52', '#3f4685'],
};

const DEFAULT_GRADIENT: [string, string] = ['#222a52', '#3f4685'];

/** Returns a CSS `linear-gradient(...)` string for a category cover fallback. */
export function categoryGradient(category?: string): string {
  const stops = (category && CATEGORY_GRADIENT[category as Category]) || DEFAULT_GRADIENT;
  return `linear-gradient(135deg, ${stops[0]}, ${stops[1]})`;
}
