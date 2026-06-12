/**
 * Creator niches (PRD §5.3). Creators can select multiple; campaigns are ranked
 * against a creator's niches in discovery (PRD §13).
 */
export const NICHES = [
  'Food',
  'Lifestyle',
  'Fashion',
  'Beauty',
  'Fitness',
  'Health & Wellness',
  'Tech',
  'Gaming',
  'Travel',
  'Parenting',
  'Education',
  'Comedy',
  'Music',
  'Art & Design',
  'Business & Finance',
] as const;

export type Niche = (typeof NICHES)[number];

export const isNiche = (value: string): value is Niche =>
  (NICHES as readonly string[]).includes(value);
