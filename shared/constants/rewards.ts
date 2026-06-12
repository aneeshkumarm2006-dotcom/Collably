/**
 * Reward types a business offers in exchange for content (PRD §5.4, §13 filter).
 */
export const REWARD_TYPES = [
  'Product',
  'Experience',
  'Voucher',
  'Service',
  'Cash+Product',
] as const;

export type RewardType = (typeof REWARD_TYPES)[number];

export const isRewardType = (value: string): value is RewardType =>
  (REWARD_TYPES as readonly string[]).includes(value);
