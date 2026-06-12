/**
 * Business / Campaign categories (PRD §5.2, §5.4, §13 filter).
 * `as const` gives us a runtime list (for filter chips) + a literal union type.
 */
export const CATEGORIES = [
  'Restaurant',
  'Cafe',
  'Food & Beverage',
  'Fashion',
  'Beauty',
  'Salon & Spa',
  'Health & Wellness',
  'Fitness',
  'Tech',
  'Gaming',
  'Travel',
  'Home & Lifestyle',
  'Education',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const isCategory = (value: string): value is Category =>
  (CATEGORIES as readonly string[]).includes(value);
