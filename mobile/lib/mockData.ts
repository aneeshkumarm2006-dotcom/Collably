/**
 * Demo dataset for running the app without a backend (dev/showcase mode).
 *
 * A small but coherent India-locale world — businesses, creators, campaigns,
 * applications, notifications and admin records that all cross-reference by id, so
 * every screen (explore, collab detail, applicant lists, profiles, admin) renders
 * realistic, internally-consistent data. `lib/mockApi` serves these arrays through
 * a fake axios adapter and mutates them in place so writes (apply / accept / verify
 * / status changes) persist for the session and feel real.
 *
 * Money values are whole rupees (₹), matching `formatReward`'s `en-IN` formatting.
 */
import type {
  Application,
  BusinessProfile,
  Campaign,
  CreatorProfile,
  Notification,
  PublicUser,
  Report,
  UserSummary,
} from '@/types';

// ── date helpers ─────────────────────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;
/** ISO string `n` days from now (negative = past). */
export const iso = (days: number): string => new Date(Date.now() + days * DAY).toISOString();
/** Unsplash lifestyle photo by id (matches the welcome carousel style). */
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

// ── identity constants ───────────────────────────────────────────────────────
export const ME_CREATOR_USER = 'u-creator-me';
export const ME_CREATOR_PROFILE = 'cp-me';
export const ME_BUSINESS_USER = 'u-biz-me';
export const ME_BUSINESS_PROFILE = 'bp-me';
export const ME_ADMIN_USER = 'u-admin';

// ── users ────────────────────────────────────────────────────────────────────
export const users: PublicUser[] = [
  {
    _id: ME_CREATOR_USER, name: 'Priya Sharma', email: 'priya@collably.app', role: 'creator',
    avatar: img('1494790108377-be9c29b29330'), isVerified: true, isOnboarded: true, isBanned: false,
    notificationPrefs: { push: true, email: true }, createdAt: iso(-120),
  },
  {
    _id: ME_BUSINESS_USER, name: 'Saffron Table', email: 'hello@saffrontable.in', role: 'business',
    avatar: img('1517248135467-4c7edcad34c4'), isVerified: true, isOnboarded: true, isBanned: false,
    notificationPrefs: { push: true, email: true }, createdAt: iso(-200),
  },
  {
    _id: ME_ADMIN_USER, name: 'Aneesh (Admin)', email: 'admin@collably.app', role: 'admin',
    avatar: null, isVerified: true, isOnboarded: true, isBanned: false, createdAt: iso(-300),
  },
  // applicant creators
  { _id: 'u-creator-1', name: 'Arjun Mehta', email: 'arjun@example.in', role: 'creator', avatar: img('1500648767791-00dcc994a43e'), isVerified: true, isOnboarded: true, isBanned: false, createdAt: iso(-90) },
  { _id: 'u-creator-2', name: 'Neha Kapoor', email: 'neha@example.in', role: 'creator', avatar: img('1534528741775-53994a69daeb'), isVerified: true, isOnboarded: true, isBanned: false, createdAt: iso(-75) },
  { _id: 'u-creator-3', name: 'Rohan Das', email: 'rohan@example.in', role: 'creator', avatar: img('1507003211169-0a1dd7228f2d'), isVerified: false, isOnboarded: true, isBanned: false, createdAt: iso(-60) },
  { _id: 'u-creator-4', name: 'Ananya Iyer', email: 'ananya@example.in', role: 'creator', avatar: img('1438761681033-6461ffad8d80'), isVerified: true, isOnboarded: true, isBanned: false, createdAt: iso(-45) },
  { _id: 'u-creator-5', name: 'Kabir Singh', email: 'kabir@example.in', role: 'creator', avatar: img('1463453091185-61582044d556'), isVerified: false, isOnboarded: true, isBanned: false, createdAt: iso(-30) },
  // business owners
  { _id: 'u-biz-1', name: 'Bloom Beauty Co.', email: 'team@bloombeauty.in', role: 'business', avatar: img('1596462502278-27bfdc403348'), isVerified: true, isOnboarded: true, isBanned: false, createdAt: iso(-180) },
  { _id: 'u-biz-2', name: 'Peak Fitness Studio', email: 'hi@peakfitness.in', role: 'business', avatar: img('1571902943202-507ec2618e8f'), isVerified: true, isOnboarded: true, isBanned: false, createdAt: iso(-160) },
  { _id: 'u-biz-3', name: 'Chai & Chapter', email: 'cafe@chaichapter.in', role: 'business', avatar: img('1442512595331-e89e73853f31'), isVerified: false, isOnboarded: true, isBanned: false, createdAt: iso(-140) },
  { _id: 'u-biz-4', name: 'Thread & Co.', email: 'studio@threadco.in', role: 'business', avatar: img('1441986300917-64674bd600d8'), isVerified: true, isOnboarded: true, isBanned: false, createdAt: iso(-130) },
];

// ── business profiles ─────────────────────────────────────────────────────────
export const businessProfiles: BusinessProfile[] = [
  {
    _id: ME_BUSINESS_PROFILE, userId: ME_BUSINESS_USER, businessName: 'Saffron Table',
    description: 'Modern Indian dining in Bandra. We love working with food & lifestyle creators to share our seasonal menu.',
    category: 'Restaurant', location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    website: 'https://saffrontable.in', socialLinks: { instagram: 'saffrontable' }, logo: img('1517248135467-4c7edcad34c4'),
    isVerified: true, isSuspended: false, totalCampaigns: 4, totalCollabsCompleted: 18, createdAt: iso(-200),
  },
  {
    _id: 'bp-1', userId: 'u-biz-1', businessName: 'Bloom Beauty Co.',
    description: 'Clean, cruelty-free skincare made in India. Looking for honest UGC and review creators.',
    category: 'Beauty', location: { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
    website: 'https://bloombeauty.in', socialLinks: { instagram: 'bloombeauty' }, logo: img('1596462502278-27bfdc403348'),
    isVerified: true, isSuspended: false, totalCampaigns: 6, totalCollabsCompleted: 31, createdAt: iso(-180),
  },
  {
    _id: 'bp-2', userId: 'u-biz-2', businessName: 'Peak Fitness Studio',
    description: 'Strength & conditioning studio in CP. Free month memberships for fitness creators.',
    category: 'Fitness', location: { city: 'Delhi', state: 'Delhi', country: 'India' },
    website: 'https://peakfitness.in', socialLinks: { instagram: 'peakfitness' }, logo: img('1571902943202-507ec2618e8f'),
    isVerified: true, isSuspended: false, totalCampaigns: 3, totalCollabsCompleted: 12, createdAt: iso(-160),
  },
  {
    _id: 'bp-3', userId: 'u-biz-3', businessName: 'Chai & Chapter',
    description: 'A cosy book café in Koregaon Park. Tag us in your slow mornings.',
    category: 'Cafe', location: { city: 'Pune', state: 'Maharashtra', country: 'India' },
    website: 'https://chaichapter.in', socialLinks: { instagram: 'chaichapter' }, logo: img('1442512595331-e89e73853f31'),
    isVerified: false, isSuspended: false, totalCampaigns: 2, totalCollabsCompleted: 7, createdAt: iso(-140),
  },
  {
    _id: 'bp-4', userId: 'u-biz-4', businessName: 'Thread & Co.',
    description: 'Sustainable everyday fashion, handmade in Hyderabad.',
    category: 'Fashion', location: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
    website: 'https://threadco.in', socialLinks: { instagram: 'threadco' }, logo: img('1441986300917-64674bd600d8'),
    isVerified: true, isSuspended: false, totalCampaigns: 4, totalCollabsCompleted: 22, createdAt: iso(-130),
  },
];

// ── creator profiles ───────────────────────────────────────────────────────────
export const creatorProfiles: CreatorProfile[] = [
  {
    _id: ME_CREATOR_PROFILE, userId: ME_CREATOR_USER,
    bio: 'Mumbai food & lifestyle creator. I shoot cosy reels of cafés, home recipes and slow weekends.',
    niche: ['Food', 'Lifestyle'], location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    socialHandles: { instagram: { handle: 'priyaeats', followerCount: 18400, engagementRate: 5.2 }, youtube: { handle: 'PriyaEats', subscriberCount: 4200 } },
    contentTypes: ['Reel', 'Story', 'Photo'],
    portfolio: [
      { imageUrl: img('1504674900247-0877df9cc836'), caption: 'Sunday brunch reel' },
      { imageUrl: img('1467003909585-2f8a72700288'), caption: 'Café morning' },
      { imageUrl: img('1490645935967-10de6ba17061'), caption: 'Home recipe series' },
    ],
    totalCollabsCompleted: 14, totalRewardsEarned: 86000, isUGCOnly: false, isSuspended: false, createdAt: iso(-120),
  },
  {
    _id: 'cp-1', userId: 'u-creator-1', bio: 'Fitness & strength content. Delhi.', niche: ['Fitness', 'Health & Wellness'],
    location: { city: 'Delhi', state: 'Delhi', country: 'India' },
    socialHandles: { instagram: { handle: 'arjunlifts', followerCount: 32000, engagementRate: 4.1 } },
    contentTypes: ['Reel', 'Short'], portfolio: [{ imageUrl: img('1517836357463-d25dfeac3438') }],
    totalCollabsCompleted: 9, totalRewardsEarned: 54000, isUGCOnly: false, isSuspended: false, createdAt: iso(-90),
  },
  {
    _id: 'cp-2', userId: 'u-creator-2', bio: 'Skincare & beauty reviews you can trust.', niche: ['Beauty'],
    location: { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
    socialHandles: { instagram: { handle: 'nehaglow', followerCount: 51000, engagementRate: 6.3 }, youtube: { handle: 'NehaGlow', subscriberCount: 22000 } },
    contentTypes: ['Reel', 'Review', 'Long Video'], portfolio: [{ imageUrl: img('1522335789203-aabd1fc54bc9') }],
    totalCollabsCompleted: 21, totalRewardsEarned: 142000, isUGCOnly: false, isSuspended: false, createdAt: iso(-75),
  },
  {
    _id: 'cp-3', userId: 'u-creator-3', bio: 'Food photographer & café hopper in Pune.', niche: ['Food', 'Travel'],
    location: { city: 'Pune', state: 'Maharashtra', country: 'India' },
    socialHandles: { instagram: { handle: 'rohaneats', followerCount: 8700, engagementRate: 7.0 } },
    contentTypes: ['Photo', 'Post', 'Story'], portfolio: [{ imageUrl: img('1414235077428-338989a2e8c0') }],
    totalCollabsCompleted: 5, totalRewardsEarned: 21000, isUGCOnly: false, isSuspended: false, createdAt: iso(-60),
  },
  {
    _id: 'cp-4', userId: 'u-creator-4', bio: 'Slow fashion & sustainable style.', niche: ['Fashion', 'Lifestyle'],
    location: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
    socialHandles: { instagram: { handle: 'ananyawears', followerCount: 27500, engagementRate: 5.8 } },
    contentTypes: ['Reel', 'Post'], portfolio: [{ imageUrl: img('1483985988355-763728e1935b') }],
    totalCollabsCompleted: 12, totalRewardsEarned: 73000, isUGCOnly: false, isSuspended: false, createdAt: iso(-45),
  },
  {
    _id: 'cp-5', userId: 'u-creator-5', bio: 'UGC creator — clean product videos, no public following needed.', niche: ['Tech', 'Lifestyle'],
    location: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
    socialHandles: {}, contentTypes: ['UGC', 'Review'], portfolio: [{ imageUrl: img('1531297484001-80022131f5a1') }],
    totalCollabsCompleted: 3, totalRewardsEarned: 12000, isUGCOnly: true, isSuspended: false, createdAt: iso(-30),
  },
];

// ── campaigns ───────────────────────────────────────────────────────────────────
export const campaigns: Campaign[] = [
  {
    _id: 'c-1', businessId: ME_BUSINESS_PROFILE, title: 'Tasting Menu for Two', category: 'Restaurant',
    description: 'Join us for our new seasonal tasting menu and capture the experience. We host you and a guest; you share a reel + 3 stories.',
    isRemote: false, location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    reward: { type: 'Experience', description: '7-course tasting menu for two', estimatedValue: 6000 },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1, requirements: 'Tag @saffrontable, 20s+' }, { platform: 'Instagram', contentType: 'Story', quantity: 3 }],
    deadline: iso(12), spotsTotal: 5, spotsRemaining: 3, minFollowers: 2000, status: 'Active', tags: ['food', 'fine-dining', 'mumbai'],
    coverImage: img('1504674900247-0877df9cc836'), applicationsCount: 2, isFeatured: true, isSpam: false, createdAt: iso(-8),
  },
  {
    _id: 'c-2', businessId: ME_BUSINESS_PROFILE, title: 'Weekend Brunch Feature', category: 'Restaurant',
    description: 'Show off our bottomless weekend brunch. Great for lifestyle creators who love a slow Sunday.',
    isRemote: false, location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    reward: { type: 'Voucher', description: 'Weekend dining voucher', estimatedValue: 3000 },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }], deadline: iso(20),
    spotsTotal: 8, spotsRemaining: 5, minFollowers: 1000, status: 'Active', tags: ['brunch', 'lifestyle'],
    coverImage: img('1533920379810-6bedac9e31f4'), applicationsCount: 3, isFeatured: false, isSpam: false, createdAt: iso(-5),
  },
  {
    _id: 'c-3', businessId: ME_BUSINESS_PROFILE, title: 'Diwali Special Campaign', category: 'Restaurant',
    description: 'Festive thali shoot for Diwali week. Currently paused while we finalise the menu.',
    isRemote: false, location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    reward: { type: 'Cash+Product', description: 'Cash + festive thali', estimatedValue: 4000 },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }], deadline: iso(35),
    spotsTotal: 6, spotsRemaining: 6, minFollowers: 3000, status: 'Paused', tags: ['diwali', 'festive'],
    coverImage: img('1601050690597-df0568f70950'), applicationsCount: 0, isFeatured: false, isSpam: false, createdAt: iso(-3),
  },
  {
    _id: 'c-4', businessId: 'bp-1', title: 'Skincare Set Review', category: 'Beauty',
    description: 'Honest review of our new vitamin-C glow set. We send the full kit; you share an honest review reel.',
    isRemote: true, reward: { type: 'Product', description: 'Full glow skincare set', estimatedValue: 2400 },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }, { platform: 'Instagram', contentType: 'Story', quantity: 2 }],
    deadline: iso(15), spotsTotal: 10, spotsRemaining: 6, minFollowers: 5000, status: 'Active', tags: ['skincare', 'review', 'ugc'],
    coverImage: img('1596462502278-27bfdc403348'), applicationsCount: 14, isFeatured: true, isSpam: false, createdAt: iso(-10),
  },
  {
    _id: 'c-5', businessId: 'bp-1', title: 'Summer Glow Reels', category: 'Beauty',
    description: 'Bright, summery reels featuring our SPF range.',
    isRemote: true, reward: { type: 'Product', description: 'SPF + glow bundle', estimatedValue: 1800 },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 2 }], deadline: iso(9),
    spotsTotal: 12, spotsRemaining: 4, minFollowers: 8000, status: 'Active', tags: ['summer', 'spf'],
    coverImage: img('1512496015851-a90fb38ba796'), applicationsCount: 9, isFeatured: false, isSpam: false, createdAt: iso(-7),
  },
  {
    _id: 'c-6', businessId: 'bp-2', title: '30-Day Fitness Challenge', category: 'Fitness',
    description: 'Document a 30-day transformation with a free studio membership. Weekly reels.',
    isRemote: false, location: { city: 'Delhi', state: 'Delhi', country: 'India' },
    reward: { type: 'Service', description: '1-month studio membership', estimatedValue: 5000 },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 4 }], deadline: iso(30),
    spotsTotal: 4, spotsRemaining: 2, minFollowers: 10000, status: 'Active', tags: ['fitness', 'challenge', 'delhi'],
    coverImage: img('1571902943202-507ec2618e8f'), applicationsCount: 6, isFeatured: false, isSpam: false, createdAt: iso(-14),
  },
  {
    _id: 'c-7', businessId: 'bp-3', title: 'Cozy Cafe Mornings', category: 'Cafe',
    description: 'Capture a slow morning at our book café — coffee, books, soft light.',
    isRemote: false, location: { city: 'Pune', state: 'Maharashtra', country: 'India' },
    reward: { type: 'Voucher', description: 'Café dining voucher', estimatedValue: 1500 },
    deliverables: [{ platform: 'Instagram', contentType: 'Photo', quantity: 3 }, { platform: 'Instagram', contentType: 'Story', quantity: 2 }],
    deadline: iso(18), spotsTotal: 6, spotsRemaining: 4, minFollowers: 0, status: 'Active', tags: ['cafe', 'cosy', 'pune', 'ugc'],
    coverImage: img('1442512595331-e89e73853f31'), applicationsCount: 4, isFeatured: false, isSpam: false, createdAt: iso(-6),
  },
  {
    _id: 'c-8', businessId: 'bp-4', title: 'Festive Fashion Haul', category: 'Fashion',
    description: 'Style our festive collection your way. Pick any 3 pieces to keep.',
    isRemote: true, reward: { type: 'Product', description: '3 festive outfits', estimatedValue: 7500 },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }, { platform: 'YouTube', contentType: 'Short', quantity: 1 }],
    deadline: iso(22), spotsTotal: 8, spotsRemaining: 5, minFollowers: 6000, status: 'Active', tags: ['fashion', 'festive', 'haul'],
    coverImage: img('1441986300917-64674bd600d8'), applicationsCount: 11, isFeatured: true, isSpam: false, createdAt: iso(-11),
  },
  {
    _id: 'c-9', businessId: 'bp-4', title: 'Sustainable Style Story', category: 'Fashion',
    description: 'Tell the story behind slow fashion with our handmade basics.',
    isRemote: true, reward: { type: 'Cash+Product', description: 'Cash + 2 wardrobe pieces', estimatedValue: 5500 },
    deliverables: [{ platform: 'Instagram', contentType: 'Post', quantity: 2 }], deadline: iso(26),
    spotsTotal: 5, spotsRemaining: 5, minFollowers: 4000, status: 'Active', tags: ['sustainable', 'fashion'],
    coverImage: img('1483985988355-763728e1935b'), applicationsCount: 2, isFeatured: false, isSpam: false, createdAt: iso(-4),
  },
  {
    _id: 'c-10', businessId: 'bp-2', title: 'Protein Smoothie UGC', category: 'Health & Wellness',
    description: 'No following needed — just clean, well-lit product videos of our smoothie mix.',
    isRemote: true, reward: { type: 'Product', description: '3 months smoothie supply', estimatedValue: 4500 },
    deliverables: [{ platform: 'Any', contentType: 'UGC', quantity: 2 }], deadline: iso(16),
    spotsTotal: 15, spotsRemaining: 12, minFollowers: 0, status: 'Active', tags: ['ugc', 'wellness', 'no-minimum'],
    coverImage: img('1490645935967-10de6ba17061'), applicationsCount: 5, isFeatured: false, isSpam: false, createdAt: iso(-9),
  },
  {
    _id: 'c-11', businessId: 'bp-1', title: 'Bridal Makeup Experience', category: 'Beauty',
    description: 'A full bridal trial at our flagship studio, filmed start to finish.',
    isRemote: false, location: { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
    reward: { type: 'Experience', description: 'Full bridal makeup trial', estimatedValue: 8000 },
    deliverables: [{ platform: 'YouTube', contentType: 'Long Video', quantity: 1 }], deadline: iso(28),
    spotsTotal: 3, spotsRemaining: 2, minFollowers: 15000, status: 'Active', tags: ['bridal', 'beauty', 'bengaluru'],
    coverImage: img('1487412947147-5cebf100ffc2'), applicationsCount: 7, isFeatured: false, isSpam: false, createdAt: iso(-13),
  },
  {
    _id: 'c-12', businessId: ME_BUSINESS_PROFILE, title: "Chef's Table (Draft)", category: 'Restaurant',
    description: 'An intimate chef’s table evening — still drafting the details before we publish.',
    isRemote: false, location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    reward: { type: 'Experience', description: "Chef's table for two", estimatedValue: 9000 },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }], deadline: iso(40),
    spotsTotal: 2, spotsRemaining: 2, minFollowers: 5000, status: 'Draft', tags: ['chefs-table', 'premium'],
    coverImage: img('1414235077428-338989a2e8c0'), applicationsCount: 0, isFeatured: false, isSpam: false, createdAt: iso(-1),
  },
];

// ── applications ────────────────────────────────────────────────────────────────
export const applications: Application[] = [
  // me-creator applying to other brands' campaigns
  { _id: 'a-1', campaignId: 'c-4', creatorId: ME_CREATOR_PROFILE, businessId: 'bp-1', status: 'Pending', pitch: 'I make honest skincare reels for sensitive skin — would love to try the glow set.', createdAt: iso(-2) },
  { _id: 'a-2', campaignId: 'c-6', creatorId: ME_CREATOR_PROFILE, businessId: 'bp-2', status: 'Accepted', pitch: 'Ready to document the full 30 days!', createdAt: iso(-9), updatedAt: iso(-7) },
  { _id: 'a-3', campaignId: 'c-7', creatorId: ME_CREATOR_PROFILE, businessId: 'bp-3', status: 'Accepted', pitch: 'Cosy mornings are my whole vibe.', submissionLink: 'https://instagram.com/reel/abc123', submissionNote: 'Posted the reel + 2 stories this morning ☕', submittedAt: iso(-1), createdAt: iso(-6), updatedAt: iso(-1) },
  { _id: 'a-4', campaignId: 'c-8', creatorId: ME_CREATOR_PROFILE, businessId: 'bp-4', status: 'Completed', pitch: 'Festive styling is my favourite.', submissionLink: 'https://instagram.com/reel/def456', submittedAt: iso(-12), verifiedAt: iso(-10), verifiedBy: 'u-biz-4', businessNote: 'Loved the reel — thank you!', createdAt: iso(-16), updatedAt: iso(-10) },
  { _id: 'a-5', campaignId: 'c-5', creatorId: ME_CREATOR_PROFILE, businessId: 'bp-1', status: 'Rejected', pitch: 'Would love to feature the SPF range.', createdAt: iso(-7), updatedAt: iso(-5), businessNote: 'Looking for 10k+ this round — please apply next time!' },
  { _id: 'a-6', campaignId: 'c-11', creatorId: ME_CREATOR_PROFILE, businessId: 'bp-1', status: 'Pending', pitch: 'I have a bridal audience that would love this.', createdAt: iso(-1) },

  // other creators applying to me-business (Saffron Table) campaigns
  { _id: 'a-10', campaignId: 'c-1', creatorId: 'cp-1', businessId: ME_BUSINESS_PROFILE, status: 'Pending', pitch: 'Fitness creator but I love a good cheat meal — would showcase the tasting menu beautifully.', createdAt: iso(-3) },
  { _id: 'a-11', campaignId: 'c-1', creatorId: 'cp-3', businessId: ME_BUSINESS_PROFILE, status: 'Pending', pitch: 'Pune-based food photographer, happy to travel to Mumbai for this.', createdAt: iso(-2) },
  { _id: 'a-12', campaignId: 'c-1', creatorId: 'cp-2', businessId: ME_BUSINESS_PROFILE, status: 'Accepted', pitch: 'Would pair this with a get-ready-with-me.', submissionLink: 'https://instagram.com/reel/ghi789', submissionNote: 'Reel is live — tagged you!', submittedAt: iso(-1), createdAt: iso(-6), updatedAt: iso(-4) },
  { _id: 'a-13', campaignId: 'c-2', creatorId: 'cp-4', businessId: ME_BUSINESS_PROFILE, status: 'Accepted', pitch: 'Perfect lazy-Sunday content for my audience.', createdAt: iso(-4), updatedAt: iso(-3) },
  { _id: 'a-14', campaignId: 'c-2', creatorId: 'cp-5', businessId: ME_BUSINESS_PROFILE, status: 'Pending', pitch: 'Can deliver clean UGC of the brunch spread.', createdAt: iso(-1) },
  { _id: 'a-15', campaignId: 'c-2', creatorId: 'cp-1', businessId: ME_BUSINESS_PROFILE, status: 'Completed', pitch: 'Done this kind of feature before.', submissionLink: 'https://instagram.com/reel/jkl012', submittedAt: iso(-9), verifiedAt: iso(-8), verifiedBy: ME_BUSINESS_USER, businessNote: 'Great work!', createdAt: iso(-13), updatedAt: iso(-8) },
];

// ── notifications ────────────────────────────────────────────────────────────────
export const notifications: Notification[] = [
  // creator (me)
  { _id: 'n-1', userId: ME_CREATOR_USER, type: 'application_accepted', message: 'Peak Fitness Studio accepted your application for "30-Day Fitness Challenge".', deepLinkPath: '/(creator)/collabs/a-2', isRead: false, createdAt: iso(-7) },
  { _id: 'n-2', userId: ME_CREATOR_USER, type: 'submission_verified', message: 'Thread & Co. verified your submission for "Festive Fashion Haul". Reward unlocked!', deepLinkPath: '/(creator)/collabs/a-4', isRead: false, createdAt: iso(-10) },
  { _id: 'n-3', userId: ME_CREATOR_USER, type: 'application_rejected', message: 'Your application for "Summer Glow Reels" wasn’t selected this time.', deepLinkPath: '/(creator)/campaign/c-5', isRead: true, createdAt: iso(-5) },
  { _id: 'n-4', userId: ME_CREATOR_USER, type: 'campaign_expiring', message: '"Cozy Cafe Mornings" closes in 2 days — submit your content soon.', deepLinkPath: '/(creator)/collabs/a-3', isRead: true, createdAt: iso(-1) },
  // business (me)
  { _id: 'n-10', userId: ME_BUSINESS_USER, type: 'new_application', message: 'Arjun Mehta applied to "Tasting Menu for Two".', deepLinkPath: '/(business)/campaigns/c-1/applications', isRead: false, createdAt: iso(-3) },
  { _id: 'n-11', userId: ME_BUSINESS_USER, type: 'submission_received', message: 'Neha Kapoor submitted content for "Tasting Menu for Two".', deepLinkPath: '/(business)/submissions', isRead: false, createdAt: iso(-1) },
  { _id: 'n-12', userId: ME_BUSINESS_USER, type: 'new_application', message: 'Kabir Singh applied to "Weekend Brunch Feature".', deepLinkPath: '/(business)/campaigns/c-2/applications', isRead: true, createdAt: iso(-1) },
];

// ── reports (admin) ──────────────────────────────────────────────────────────────
export const reports: Report[] = [
  { _id: 'r-1', reporterId: 'u-creator-3', targetType: 'campaign', targetId: 'c-5', reason: 'Reward not delivered after submission.', status: 'open', createdAt: iso(-2) },
  { _id: 'r-2', reporterId: 'u-creator-2', targetType: 'business', targetId: 'bp-3', reason: 'Unresponsive after accepting.', status: 'open', createdAt: iso(-4) },
  { _id: 'r-3', reporterId: 'u-biz-1', targetType: 'creator', targetId: 'cp-5', reason: 'Submitted content unrelated to the brief.', status: 'dismissed', resolvedBy: ME_ADMIN_USER, resolvedAt: iso(-1), createdAt: iso(-6) },
];

// ── lookup helpers ────────────────────────────────────────────────────────────────
export const userById = (id: string): PublicUser | undefined => users.find((u) => u._id === id);
export const summaryOf = (id: string): UserSummary | null => {
  const u = userById(id);
  return u ? { _id: u._id, name: u.name, avatar: u.avatar, role: u.role, createdAt: u.createdAt } : null;
};
export const creatorProfileByUser = (userId: string) => creatorProfiles.find((p) => p.userId === userId);
export const businessProfileByUser = (userId: string) => businessProfiles.find((p) => p.userId === userId);
export const creatorProfileById = (id: string) => creatorProfiles.find((p) => p._id === id);
export const businessProfileById = (id: string) => businessProfiles.find((p) => p._id === id);
export const campaignById = (id: string) => campaigns.find((c) => c._id === id);

/** A campaign joined with its (lightweight) business profile, as the screens expect. */
export const withBusiness = (c: Campaign) => ({ ...c, business: businessProfileById(c.businessId) ?? undefined });
/** An application joined with campaign(+business), creator profile and creator user. */
export const withRefs = (a: Application) => {
  const campaign = campaignById(a.campaignId);
  const creator = creatorProfileById(a.creatorId);
  return {
    ...a,
    campaign: campaign ? withBusiness(campaign) : undefined,
    creator,
    creatorUser: creator ? summaryOf(creator.userId) : null,
  };
};
