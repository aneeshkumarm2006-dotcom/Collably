import { describe, expect, it } from 'vitest';
import type { Category, Niche, RewardType } from '@/lib/shared';
import { CATEGORIES, NICHES, REWARD_TYPES } from '@/lib/shared';
import {
  categoryEmoji,
  categoryGradient,
  nicheEmoji,
  rewardEmoji,
} from '@/lib/domain-meta';

describe('rewardEmoji', () => {
  it('maps every known reward type to a non-empty glyph', () => {
    for (const type of REWARD_TYPES) {
      expect(rewardEmoji(type)).toBeTruthy();
    }
  });

  it('returns the specific glyph for known reward types', () => {
    expect(rewardEmoji('Product')).toBe('🎁');
    expect(rewardEmoji('Experience')).toBe('✨');
    expect(rewardEmoji('Voucher')).toBe('🎟️');
    expect(rewardEmoji('Service')).toBe('🛎️');
    expect(rewardEmoji('Cash+Product')).toBe('💰');
  });

  it('falls back to the gift glyph for an unknown reward type', () => {
    expect(rewardEmoji('Mystery' as unknown as RewardType)).toBe('🎁');
    expect(rewardEmoji('' as unknown as RewardType)).toBe('🎁');
  });
});

describe('categoryEmoji', () => {
  it('maps every known category to a non-empty glyph', () => {
    for (const category of CATEGORIES) {
      expect(categoryEmoji(category)).toBeTruthy();
    }
  });

  it('returns the specific glyph for known categories', () => {
    expect(categoryEmoji('Restaurant')).toBe('🍽️');
    expect(categoryEmoji('Cafe')).toBe('☕');
    expect(categoryEmoji('Food & Beverage')).toBe('🥤');
    expect(categoryEmoji('Tech')).toBe('📱');
    expect(categoryEmoji('Other')).toBe('🏷️');
  });

  it('falls back to the tag glyph for unknown / empty categories', () => {
    expect(categoryEmoji('Aerospace')).toBe('🏷️');
    expect(categoryEmoji('')).toBe('🏷️');
    expect(categoryEmoji('restaurant')).toBe('🏷️'); // case-sensitive lookup
  });
});

describe('nicheEmoji', () => {
  it('maps every known niche to a non-empty glyph', () => {
    for (const niche of NICHES) {
      expect(nicheEmoji(niche)).toBeTruthy();
    }
  });

  it('returns the specific glyph for known niches', () => {
    expect(nicheEmoji('Food')).toBe('🍜');
    expect(nicheEmoji('Lifestyle')).toBe('🌸');
    expect(nicheEmoji('Comedy')).toBe('😂');
    expect(nicheEmoji('Art & Design')).toBe('🎨');
    expect(nicheEmoji('Business & Finance')).toBe('📈');
  });

  it('falls back to the sparkle glyph for unknown / empty niches', () => {
    expect(nicheEmoji('Astrology')).toBe('✨');
    expect(nicheEmoji('')).toBe('✨');
    expect(nicheEmoji('food')).toBe('✨'); // case-sensitive lookup
  });
});

describe('categoryGradient', () => {
  it('returns a 135deg linear-gradient with the two stops of a known category', () => {
    expect(categoryGradient('Restaurant')).toBe('linear-gradient(135deg, #1e2747, #33406b)');
    expect(categoryGradient('Cafe')).toBe('linear-gradient(135deg, #3a2c1e, #5e4a32)');
    expect(categoryGradient('Beauty')).toBe('linear-gradient(135deg, #3a2350, #5a3f7a)');
  });

  it('produces a valid linear-gradient string for every known category', () => {
    for (const category of CATEGORIES) {
      expect(categoryGradient(category)).toMatch(
        /^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/,
      );
    }
  });

  const DEFAULT = 'linear-gradient(135deg, #222a52, #3f4685)';

  it('returns the default gradient for an unknown category', () => {
    expect(categoryGradient('Aerospace' as Category)).toBe(DEFAULT);
  });

  it('returns the default gradient when category is undefined', () => {
    expect(categoryGradient(undefined)).toBe(DEFAULT);
    expect(categoryGradient()).toBe(DEFAULT);
  });

  it('returns the default gradient for an empty string (falsy guard)', () => {
    expect(categoryGradient('')).toBe(DEFAULT);
  });

  it('treats the "Other" category as the default-coloured gradient', () => {
    // CATEGORY_GRADIENT.Other shares the same stops as DEFAULT_GRADIENT.
    expect(categoryGradient('Other')).toBe(DEFAULT);
  });
});
