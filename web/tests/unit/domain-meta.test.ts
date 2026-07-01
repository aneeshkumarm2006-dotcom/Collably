import { describe, expect, it } from 'vitest';
import {
  BookOpen,
  Coffee,
  CupSoda,
  Gift,
  Laugh,
  Palette,
  Sparkles,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  Utensils,
  Flower2,
  Smartphone,
  Ticket,
  ConciergeBell,
  Wallet,
} from 'lucide-react';
import type { Category, Niche, RewardType } from '@/lib/shared';
import { CATEGORIES, NICHES, REWARD_TYPES } from '@/lib/shared';
import { categoryGradient, categoryIcon, nicheIcon, rewardIcon } from '@/lib/domain-meta';

describe('rewardIcon', () => {
  it('maps every known reward type to an icon component', () => {
    for (const type of REWARD_TYPES) {
      expect(typeof rewardIcon(type)).toBe('object');
      expect(rewardIcon(type)).toBeTruthy();
    }
  });

  it('returns the specific icon for known reward types', () => {
    expect(rewardIcon('Product')).toBe(Gift);
    expect(rewardIcon('Experience')).toBe(Sparkles);
    expect(rewardIcon('Voucher')).toBe(Ticket);
    expect(rewardIcon('Service')).toBe(ConciergeBell);
    expect(rewardIcon('Cash+Product')).toBe(Wallet);
  });

  it('falls back to the gift icon for an unknown reward type', () => {
    expect(rewardIcon('Mystery' as unknown as RewardType)).toBe(Gift);
    expect(rewardIcon('' as unknown as RewardType)).toBe(Gift);
  });
});

describe('categoryIcon', () => {
  it('maps every known category to an icon component', () => {
    for (const category of CATEGORIES) {
      expect(categoryIcon(category)).toBeTruthy();
    }
  });

  it('returns the specific icon for known categories', () => {
    expect(categoryIcon('Restaurant')).toBe(UtensilsCrossed);
    expect(categoryIcon('Cafe')).toBe(Coffee);
    expect(categoryIcon('Food & Beverage')).toBe(CupSoda);
    expect(categoryIcon('Tech')).toBe(Smartphone);
    expect(categoryIcon('Other')).toBe(Tag);
  });

  it('falls back to the tag icon for unknown / empty categories', () => {
    expect(categoryIcon('Aerospace')).toBe(Tag);
    expect(categoryIcon('')).toBe(Tag);
    expect(categoryIcon('restaurant')).toBe(Tag); // case-sensitive lookup
  });
});

describe('nicheIcon', () => {
  it('maps every known niche to an icon component', () => {
    for (const niche of NICHES) {
      expect(nicheIcon(niche)).toBeTruthy();
    }
  });

  it('returns the specific icon for known niches', () => {
    expect(nicheIcon('Food')).toBe(Utensils);
    expect(nicheIcon('Lifestyle')).toBe(Flower2);
    expect(nicheIcon('Comedy')).toBe(Laugh);
    expect(nicheIcon('Art & Design')).toBe(Palette);
    expect(nicheIcon('Business & Finance')).toBe(TrendingUp);
  });

  it('falls back to the sparkles icon for unknown / empty niches', () => {
    expect(nicheIcon('Astrology')).toBe(Sparkles);
    expect(nicheIcon('')).toBe(Sparkles);
    expect(nicheIcon('food')).toBe(Sparkles); // case-sensitive lookup
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
