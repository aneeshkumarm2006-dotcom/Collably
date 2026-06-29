/**
 * Marketing copy in one place so the landing + audience pages stay in sync.
 * These are editorial/marketing figures (illustrative), not live API data. The
 * "live campaigns" rail and Explore pull the real backend.
 */
import type { FaqItem } from '@/components/marketing/faq';

/** Headline platform stats shown in the stats band + OG copy. */
export const PLATFORM_STATS = [
  { value: '1,200+', label: 'Campaigns posted' },
  { value: '8,500+', label: 'Creators joined' },
  { value: '4,200+', label: 'Collabs completed' },
] as const;

/** Category strip: label + a display count (links into Explore filtered). */
export const CATEGORY_STRIP: { label: string; count: number }[] = [
  { label: 'Restaurant', count: 342 },
  { label: 'Fashion', count: 218 },
  { label: 'Beauty', count: 195 },
  { label: 'Fitness', count: 134 },
  { label: 'Cafe', count: 121 },
  { label: 'Tech', count: 87 },
  { label: 'Travel', count: 76 },
];

export const HOW_IT_WORKS = {
  business: [
    { title: 'Post a campaign', body: "Tell creators what you're offering and what you need, in minutes." },
    { title: 'Creators apply', body: 'Browse pitches and profiles from creators who actually want to work with you.' },
    { title: 'Accept & verify', body: 'Pick the ones you love, verify the content, done. UGC without agency costs.' },
  ],
  creator: [
    { title: 'Browse your niche', body: 'Find campaigns from brands matching your niche and your city.' },
    { title: 'Apply with a pitch', body: 'No agency gatekeeping, just you, your work, and a quick pitch.' },
    { title: 'Collab & earn', body: 'Complete the collab, earn the reward, and build your portfolio.' },
  ],
} as const;

/** "Why Collably" feature grid (lucide icon name resolved in the page). */
export const FEATURES = [
  {
    icon: 'users',
    title: 'No follower minimums',
    body: 'Nano and UGC creators welcome. Brands match on fit and quality, not vanity metrics.',
  },
  {
    icon: 'gift',
    title: 'Real rewards, never "exposure"',
    body: 'Every campaign states exactly what you earn and its dollar value, before you apply.',
  },
  {
    icon: 'badge-check',
    title: 'Verified, end to end',
    body: 'Submissions are reviewed and verified so brands get what they paid for and creators get credit.',
  },
  {
    icon: 'map-pin',
    title: 'Local-first matching',
    body: 'Campaigns surface by city and niche, so you collab with brands right in your neighbourhood.',
  },
] as const;

/** Sample rewards list (perk → $ value) for the rewards section. */
export const SAMPLE_REWARDS: { name: string; category: string; value: string }[] = [
  { name: 'Tasting menu for two', category: 'Restaurant', value: '$140' },
  { name: 'Full skincare set', category: 'Beauty', value: '$95' },
  { name: '$75 dining voucher', category: 'Cafe', value: '—' },
  { name: '3-month membership', category: 'Fitness', value: '$270' },
  { name: 'Full outfit + $50', category: 'Fashion', value: '$210' },
  { name: 'Spa day for two', category: 'Health & Wellness', value: '$180' },
  { name: 'Cocktail tasting flight', category: 'Food & Beverage', value: '$90' },
  { name: 'Weekend stay', category: 'Travel', value: '$400' },
];

export const TESTIMONIALS = [
  {
    initials: 'AP',
    name: 'Aanya Patel',
    role: '@toronto.eats · Creator',
    quote:
      'As a nano creator I kept getting ignored by agencies. On Collably I landed three restaurant collabs in my first month, all in Toronto, all genuinely fun.',
  },
  {
    initials: 'DR',
    name: 'Daniel Roy',
    role: 'Owner, Maple & Oak',
    quote:
      'We replaced a $2k/month agency retainer. We post a campaign, review real pitches, and the content quality has honestly been better.',
  },
  {
    initials: 'ML',
    name: 'Marcus Lee',
    role: '@van.foodie.diaries · Creator',
    quote:
      "The reward is always clear before I apply. No chasing, no “we'll pay in exposure,” just real experiences I actually want.",
  },
] as const;

export const GENERAL_FAQS: FaqItem[] = [
  {
    q: 'Is Collably free to join?',
    a: 'Yes. Creating an account, building your profile, and browsing campaigns is completely free for both creators and businesses. Brands only pay for the rewards they offer.',
  },
  {
    q: 'Do I need a minimum follower count?',
    a: 'No. We welcome nano and UGC-only creators. Each campaign sets its own requirements, and many are open to all. Brands match on content fit, not follower count.',
  },
  {
    q: 'How do rewards work?',
    a: 'Every campaign states the reward and its dollar value up front. Once your submission is reviewed and verified by the brand, the collab is marked complete and the reward is yours.',
  },
  {
    q: 'What kinds of rewards can I earn?',
    a: 'Free products, dining experiences, vouchers, services, memberships, and cash-plus-product deals. It varies by brand, and the reward and its value show on every campaign.',
  },
  {
    q: 'How do businesses verify content?',
    a: 'Creators submit live post links and proof screenshots. Brands review each submission and can mark it verified, request a revision, or flag an issue before completing the collab.',
  },
];
