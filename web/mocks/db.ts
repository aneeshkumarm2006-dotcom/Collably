/**
 * In-memory mock dataset: the "CollabSpace" demo world recovered from
 * `backend/src/scripts/seed.ts` (Maple & Oak, Bloom Beauty, Maya Bennett, …).
 * Used by the MSW handlers when `NEXT_PUBLIC_USE_MOCKS=true`, so the website runs
 * with rich, realistic data and no backend.
 *
 * Records are stored already in their client-facing shape (string ids, ISO
 * dates); joins (a campaign's `business`, an application's `creator`) are computed
 * on read by the selectors below. Writes mutate these arrays for the life of the
 * server process. `resetDb()` re-seeds. The dataset is rebuilt lazily on first
 * access so deadlines are relative to "now".
 */
import type {
  Application,
  ApplicationStatus,
  BusinessProfile,
  Campaign,
  Conversation,
  CreatorProfile,
  Message,
  Notification,
  PublicUser,
  Report,
  UserSummary,
} from '@/lib/shared';
import type { PublicApplication, PublicCampaign } from '@/lib/api/types';

// --- id + time helpers --------------------------------------------------------

/** Deterministic 24-hex id from a stable seed key (so relationships are stable). */
export function oid(key: string): string {
  let h = 2166136261;
  const out: string[] = [];
  for (let i = 0; i < 24; i += 1) {
    h = (h ^ key.charCodeAt(i % key.length)) >>> 0;
    h = (h * 16777619) >>> 0;
    out.push(((h >>> (i % 24)) & 0xf).toString(16));
  }
  return out.join('');
}

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
const nowIso = () => new Date().toISOString();
/** ISO date `n` days from now (negative = past). */
const at = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/** Approx city centers so on-site mock campaigns plot on the Explore map (Phase 11). */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Toronto: { lat: 43.6532, lng: -79.3832 },
  Vancouver: { lat: 49.2827, lng: -123.1207 },
  Ottawa: { lat: 45.4215, lng: -75.6972 },
  Calgary: { lat: 51.0447, lng: -114.0719 },
  Montreal: { lat: 45.5019, lng: -73.5674 },
  Halifax: { lat: 44.6488, lng: -63.5752 },
};

/**
 * Build a public (unauthorized-viewer) campaign location for a mock on-site
 * campaign: the coarse city + a deterministic fuzzed `approxCoordinates` + radius,
 * mirroring `backend/src/lib/serialize.ts` (the precise pin is never sent to a
 * guest/unaccepted creator). Keyed by the campaign key so the offset is stable.
 */
function mockCampaignLocation(c: { city?: string; state?: string; key: string }) {
  const base = { city: c.city, state: c.state, country: 'Canada', locationPrecise: false as const };
  const center = c.city ? CITY_COORDS[c.city] : undefined;
  if (!center) return base;
  // Deterministic ~0.6km offset from the key so the circle isn't centered on the city pin.
  let h = 0;
  for (let i = 0; i < c.key.length; i += 1) h = (h * 31 + c.key.charCodeAt(i)) >>> 0;
  const angle = (h % 360) * (Math.PI / 180);
  const dist = 0.006 + ((h >> 8) % 5) * 0.0015;
  return {
    ...base,
    approxCoordinates: {
      lat: Math.round((center.lat + dist * Math.cos(angle)) * 1e5) / 1e5,
      lng: Math.round((center.lng + dist * Math.sin(angle)) * 1e5) / 1e5,
    },
    radiusMeters: 750,
  };
}

// --- seed source (mirrors backend/src/scripts/seed.ts) ------------------------

const USERS_SRC = [
  { key: 'u-creator-me', name: 'Maya Bennett', email: 'maya@collably.app', role: 'creator', avatar: img('1494790108377-be9c29b29330') },
  { key: 'u-biz-me', name: 'Maple & Oak', email: 'hello@mapleandoak.ca', role: 'business', avatar: img('1517248135467-4c7edcad34c4') },
  { key: 'u-admin', name: 'Admin', email: 'admin@collably.app', role: 'admin', avatar: null },
  { key: 'u-creator-1', name: 'Liam Carter', email: 'liam@example.ca', role: 'creator', avatar: img('1500648767791-00dcc994a43e') },
  { key: 'u-creator-2', name: 'Chloe Tremblay', email: 'chloe@example.ca', role: 'creator', avatar: img('1534528741775-53994a69daeb') },
  { key: 'u-creator-3', name: 'Noah Bouchard', email: 'noah@example.ca', role: 'creator', avatar: img('1507003211169-0a1dd7228f2d') },
  { key: 'u-creator-4', name: 'Ava Wilson', email: 'ava@example.ca', role: 'creator', avatar: img('1438761681033-6461ffad8d80') },
  { key: 'u-creator-5', name: 'Ethan Roy', email: 'ethan@example.ca', role: 'creator', avatar: img('1463453091185-61582044d556') },
  { key: 'u-biz-1', name: 'Bloom Beauty Co.', email: 'team@bloombeauty.ca', role: 'business', avatar: img('1596462502278-27bfdc403348') },
  { key: 'u-biz-2', name: 'Peak Fitness Studio', email: 'hi@peakfitness.ca', role: 'business', avatar: img('1571902943202-507ec2618e8f') },
  { key: 'u-biz-3', name: 'Brew & Chapter', email: 'cafe@brewchapter.ca', role: 'business', avatar: img('1442512595331-e89e73853f31') },
  { key: 'u-biz-4', name: 'Thread & Co.', email: 'studio@threadco.ca', role: 'business', avatar: img('1441986300917-64674bd600d8') },
] as const;

const BUSINESSES_SRC = [
  { key: 'bp-me', user: 'u-biz-me', businessName: 'Maple & Oak', description: 'Modern seasonal dining in Leslieville. We love working with food & lifestyle creators to share our seasonal menu.', category: 'Restaurant', city: 'Toronto', state: 'Ontario', website: 'https://mapleandoak.ca', instagram: 'mapleandoak', logo: img('1517248135467-4c7edcad34c4'), isVerified: true, totalCampaigns: 4, totalCollabsCompleted: 18 },
  { key: 'bp-1', user: 'u-biz-1', businessName: 'Bloom Beauty Co.', description: 'Clean, cruelty-free skincare made in Canada. Looking for honest UGC and review creators.', category: 'Beauty', city: 'Calgary', state: 'Alberta', website: 'https://bloombeauty.ca', instagram: 'bloombeauty', logo: img('1596462502278-27bfdc403348'), isVerified: true, totalCampaigns: 6, totalCollabsCompleted: 31 },
  { key: 'bp-2', user: 'u-biz-2', businessName: 'Peak Fitness Studio', description: 'Strength & conditioning studio in Yaletown. Free month memberships for fitness creators.', category: 'Fitness', city: 'Vancouver', state: 'British Columbia', website: 'https://peakfitness.ca', instagram: 'peakfitness', logo: img('1571902943202-507ec2618e8f'), isVerified: true, totalCampaigns: 3, totalCollabsCompleted: 12 },
  { key: 'bp-3', user: 'u-biz-3', businessName: 'Brew & Chapter', description: 'A cosy book café in the Glebe. Tag us in your slow mornings.', category: 'Cafe', city: 'Ottawa', state: 'Ontario', website: 'https://brewchapter.ca', instagram: 'brewchapter', logo: img('1442512595331-e89e73853f31'), isVerified: false, totalCampaigns: 2, totalCollabsCompleted: 7 },
  { key: 'bp-4', user: 'u-biz-4', businessName: 'Thread & Co.', description: 'Sustainable everyday fashion, handmade in Montreal.', category: 'Fashion', city: 'Montreal', state: 'Quebec', website: 'https://threadco.ca', instagram: 'threadco', logo: img('1441986300917-64674bd600d8'), isVerified: true, totalCampaigns: 4, totalCollabsCompleted: 22 },
] as const;

const CREATORS_SRC = [
  { key: 'cp-me', user: 'u-creator-me', bio: 'Toronto food & lifestyle creator. I shoot cosy reels of cafés, home recipes and slow weekends.', niche: ['Food', 'Lifestyle'], city: 'Toronto', state: 'Ontario', social: { instagram: { handle: 'mayaeats', link: 'https://instagram.com/mayaeats', followerCount: 18400, engagementRate: 5.2 }, youtube: { handle: 'MayaEats', link: 'https://youtube.com/@MayaEats', subscriberCount: 4200 } }, contentTypes: ['Reel', 'Story', 'Photo'], portfolio: [img('1504674900247-0877df9cc836'), img('1467003909585-2f8a72700288'), img('1490645935967-10de6ba17061')], collabs: 14, earned: 2400, ugc: false },
  { key: 'cp-1', user: 'u-creator-1', bio: 'Fitness & strength content. Vancouver.', niche: ['Fitness', 'Health & Wellness'], city: 'Vancouver', state: 'British Columbia', social: { instagram: { handle: 'liamlifts', link: 'https://instagram.com/liamlifts', followerCount: 32000, engagementRate: 4.1 } }, contentTypes: ['Reel', 'Short'], portfolio: [img('1517836357463-d25dfeac3438')], collabs: 9, earned: 1500, ugc: false },
  { key: 'cp-2', user: 'u-creator-2', bio: 'Skincare & beauty reviews you can trust.', niche: ['Beauty'], city: 'Calgary', state: 'Alberta', social: { instagram: { handle: 'chloeglow', link: 'https://instagram.com/chloeglow', followerCount: 51000, engagementRate: 6.3 }, youtube: { handle: 'ChloeGlow', link: 'https://youtube.com/@ChloeGlow', subscriberCount: 22000 } }, contentTypes: ['Reel', 'Review', 'Long Video'], portfolio: [img('1522335789203-aabd1fc54bc9')], collabs: 21, earned: 3900, ugc: false },
  { key: 'cp-3', user: 'u-creator-3', bio: 'Food photographer & café hopper in Ottawa.', niche: ['Food', 'Travel'], city: 'Ottawa', state: 'Ontario', social: { instagram: { handle: 'noaheats', link: 'https://instagram.com/noaheats', followerCount: 8700, engagementRate: 7.0 } }, contentTypes: ['Photo', 'Post', 'Story'], portfolio: [img('1414235077428-338989a2e8c0')], collabs: 5, earned: 600, ugc: false },
  { key: 'cp-4', user: 'u-creator-4', bio: 'Slow fashion & sustainable style.', niche: ['Fashion', 'Lifestyle'], city: 'Montreal', state: 'Quebec', social: { instagram: { handle: 'avawears', link: 'https://instagram.com/avawears', followerCount: 27500, engagementRate: 5.8 } }, contentTypes: ['Reel', 'Post'], portfolio: [img('1483985988355-763728e1935b')], collabs: 12, earned: 2000, ugc: false },
  { key: 'cp-5', user: 'u-creator-5', bio: 'UGC creator: clean product videos, no public following needed.', niche: ['Tech', 'Lifestyle'], city: 'Halifax', state: 'Nova Scotia', social: { tiktok: { handle: 'parkermakes', link: 'https://tiktok.com/@parkermakes' } }, contentTypes: ['UGC', 'Review'], portfolio: [img('1531297484001-80022131f5a1')], collabs: 3, earned: 340, ugc: true },
] as const;

const CAMPAIGNS_SRC = [
  { key: 'c-1', biz: 'bp-me', title: 'Tasting Menu for Two', category: 'Restaurant', description: 'Join us for our new seasonal tasting menu and capture the experience. We host you and a guest; you share a reel + 3 stories.', isRemote: false, city: 'Toronto', state: 'Ontario', reward: { type: 'Experience', description: '7-course tasting menu for two', estimatedValue: 180 }, deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1, requirements: 'Tag @mapleandoak, 20s+' }, { platform: 'Instagram', contentType: 'Story', quantity: 3 }], deadline: 12, minFollowers: 2000, status: 'Active', tags: ['food', 'fine-dining', 'toronto'], cover: img('1504674900247-0877df9cc836'), featured: true },
  { key: 'c-2', biz: 'bp-me', title: 'Weekend Brunch Feature', category: 'Restaurant', description: 'Show off our bottomless weekend brunch. Great for lifestyle creators who love a slow Sunday.', isRemote: false, city: 'Toronto', state: 'Ontario', reward: { type: 'Voucher', description: 'Weekend dining voucher', estimatedValue: 90 }, deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }], deadline: 20, minFollowers: 1000, status: 'Active', tags: ['brunch', 'lifestyle'], cover: img('1533920379810-6bedac9e31f4'), featured: false },
  { key: 'c-3', biz: 'bp-me', title: 'Holiday Special Campaign', category: 'Restaurant', description: 'Festive platter shoot for the holiday week. Currently paused while we finalise the menu.', isRemote: false, city: 'Toronto', state: 'Ontario', reward: { type: 'Cash+Product', description: 'Cash + festive platter', estimatedValue: 120 }, deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }], deadline: 35, minFollowers: 3000, status: 'Paused', tags: ['holiday', 'festive'], cover: img('1601050690597-df0568f70950'), featured: false },
  { key: 'c-4', biz: 'bp-1', title: 'Skincare Set Review', category: 'Beauty', description: 'Honest review of our new vitamin-C glow set. We send the full kit; you share an honest review reel.', isRemote: true, reward: { type: 'Product', description: 'Full glow skincare set', estimatedValue: 120 }, deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }, { platform: 'Instagram', contentType: 'Story', quantity: 2 }], deadline: 15, minFollowers: 5000, status: 'Active', tags: ['skincare', 'review', 'ugc'], cover: img('1596462502278-27bfdc403348'), featured: true },
  { key: 'c-5', biz: 'bp-1', title: 'Summer Glow Reels', category: 'Beauty', description: 'Bright, summery reels featuring our SPF range.', isRemote: true, reward: { type: 'Product', description: 'SPF + glow bundle', estimatedValue: 90 }, deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 2 }], deadline: 9, minFollowers: 8000, status: 'Active', tags: ['summer', 'spf'], cover: img('1512496015851-a90fb38ba796'), featured: false },
  { key: 'c-6', biz: 'bp-2', title: '30-Day Fitness Challenge', category: 'Fitness', description: 'Document a 30-day transformation with a free studio membership. Weekly reels.', isRemote: false, city: 'Vancouver', state: 'British Columbia', reward: { type: 'Service', description: '1-month studio membership', estimatedValue: 150 }, deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 4 }], deadline: 30, minFollowers: 10000, status: 'Active', tags: ['fitness', 'challenge', 'vancouver'], cover: img('1571902943202-507ec2618e8f'), featured: false },
  { key: 'c-7', biz: 'bp-3', title: 'Cozy Cafe Mornings', category: 'Cafe', description: 'Capture a slow morning at our book café: coffee, books, soft light.', isRemote: false, city: 'Ottawa', state: 'Ontario', reward: { type: 'Voucher', description: 'Café dining voucher', estimatedValue: 45 }, deliverables: [{ platform: 'Instagram', contentType: 'Photo', quantity: 3 }, { platform: 'Instagram', contentType: 'Story', quantity: 2 }], deadline: 18, minFollowers: 0, status: 'Active', tags: ['cafe', 'cosy', 'ottawa', 'ugc'], cover: img('1442512595331-e89e73853f31'), featured: false },
  { key: 'c-8', biz: 'bp-4', title: 'Festive Fashion Haul', category: 'Fashion', description: 'Style our festive collection your way. Pick any 3 pieces to keep.', isRemote: true, reward: { type: 'Product', description: '3 festive outfits', estimatedValue: 300 }, deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }, { platform: 'YouTube', contentType: 'Short', quantity: 1 }], deadline: 22, minFollowers: 6000, status: 'Active', tags: ['fashion', 'festive', 'haul'], cover: img('1441986300917-64674bd600d8'), featured: true },
  { key: 'c-9', biz: 'bp-4', title: 'Sustainable Style Story', category: 'Fashion', description: 'Tell the story behind slow fashion with our handmade basics.', isRemote: true, reward: { type: 'Cash+Product', description: 'Cash + 2 wardrobe pieces', estimatedValue: 220 }, deliverables: [{ platform: 'Instagram', contentType: 'Post', quantity: 2 }], deadline: 26, minFollowers: 4000, status: 'Active', tags: ['sustainable', 'fashion'], cover: img('1483985988355-763728e1935b'), featured: false },
  { key: 'c-10', biz: 'bp-2', title: 'Protein Smoothie UGC', category: 'Health & Wellness', description: 'No following needed, just clean, well-lit product videos of our smoothie mix.', isRemote: true, reward: { type: 'Product', description: '3 months smoothie supply', estimatedValue: 135 }, deliverables: [{ platform: 'Any', contentType: 'UGC', quantity: 2 }], deadline: 16, minFollowers: 0, status: 'Active', tags: ['ugc', 'wellness', 'no-minimum'], cover: img('1490645935967-10de6ba17061'), featured: false },
  { key: 'c-11', biz: 'bp-1', title: 'Bridal Makeup Experience', category: 'Beauty', description: 'A full bridal trial at our flagship studio, filmed start to finish.', isRemote: false, city: 'Calgary', state: 'Alberta', reward: { type: 'Experience', description: 'Full bridal makeup trial', estimatedValue: 250 }, deliverables: [{ platform: 'YouTube', contentType: 'Long Video', quantity: 1 }], deadline: 28, minFollowers: 15000, status: 'Active', tags: ['bridal', 'beauty', 'calgary'], cover: img('1487412947147-5cebf100ffc2'), featured: false },
  { key: 'c-12', biz: 'bp-me', title: "Chef's Table (Draft)", category: 'Restaurant', description: 'An intimate chef’s table evening. Still drafting the details before we publish.', isRemote: false, city: 'Toronto', state: 'Ontario', reward: { type: 'Experience', description: "Chef's table for two", estimatedValue: 280 }, deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }], deadline: 40, minFollowers: 5000, status: 'Draft', tags: ['chefs-table', 'premium'], cover: img('1414235077428-338989a2e8c0'), featured: false },
] as const;

const APPLICATIONS_SRC = [
  { key: 'a-1', campaign: 'c-4', creator: 'cp-me', biz: 'bp-1', status: 'Pending', pitch: 'I make honest skincare reels for sensitive skin, and would love to try the glow set.' },
  { key: 'a-2', campaign: 'c-6', creator: 'cp-me', biz: 'bp-2', status: 'Accepted', pitch: 'Ready to document the full 30 days!' },
  { key: 'a-3', campaign: 'c-7', creator: 'cp-me', biz: 'bp-3', status: 'Accepted', pitch: 'Cosy mornings are my whole vibe.', submissionLink: 'https://instagram.com/reel/abc123', submissionNote: 'Posted the reel + 2 stories this morning', submittedAt: -1 },
  { key: 'a-4', campaign: 'c-8', creator: 'cp-me', biz: 'bp-4', status: 'Completed', pitch: 'Festive styling is my favourite.', submissionLink: 'https://instagram.com/reel/def456', submittedAt: -12, verifiedAt: -10, verifiedBy: 'u-biz-4', businessNote: 'Loved the reel, thank you!' },
  { key: 'a-5', campaign: 'c-5', creator: 'cp-me', biz: 'bp-1', status: 'Rejected', pitch: 'Would love to feature the SPF range.', businessNote: 'Looking for 10k+ this round. Please apply next time!' },
  { key: 'a-6', campaign: 'c-11', creator: 'cp-me', biz: 'bp-1', status: 'Pending', pitch: 'I have a bridal audience that would love this.' },
  { key: 'a-10', campaign: 'c-1', creator: 'cp-1', biz: 'bp-me', status: 'Pending', pitch: 'Fitness creator but I love a good cheat meal, and would showcase the tasting menu beautifully.' },
  { key: 'a-11', campaign: 'c-1', creator: 'cp-3', biz: 'bp-me', status: 'Pending', pitch: 'Ottawa-based food photographer, happy to travel to Toronto for this.' },
  { key: 'a-12', campaign: 'c-1', creator: 'cp-2', biz: 'bp-me', status: 'Accepted', pitch: 'Would pair this with a get-ready-with-me.', submissionLink: 'https://instagram.com/reel/ghi789', submissionNote: 'Reel is live, tagged you!', submittedAt: -1 },
  { key: 'a-13', campaign: 'c-2', creator: 'cp-4', biz: 'bp-me', status: 'Accepted', pitch: 'Perfect lazy-Sunday content for my audience.' },
  { key: 'a-14', campaign: 'c-2', creator: 'cp-5', biz: 'bp-me', status: 'Pending', pitch: 'Can deliver clean UGC of the brunch spread.' },
  { key: 'a-15', campaign: 'c-2', creator: 'cp-1', biz: 'bp-me', status: 'Completed', pitch: 'Done this kind of feature before.', submissionLink: 'https://instagram.com/reel/jkl012', submittedAt: -9, verifiedAt: -8, verifiedBy: 'u-biz-me', businessNote: 'Great work!' },
] as const;

const NOTIFS_SRC = [
  { user: 'u-creator-me', type: 'application_accepted', message: 'Peak Fitness Studio accepted your application for "30-Day Fitness Challenge".', app: 'a-2', read: false },
  { user: 'u-creator-me', type: 'submission_verified', message: 'Thread & Co. verified your submission for "Festive Fashion Haul". Reward unlocked!', app: 'a-4', read: false },
  { user: 'u-creator-me', type: 'application_rejected', message: 'Your application for "Summer Glow Reels" wasn’t selected this time.', campaign: 'c-5', read: true },
  { user: 'u-creator-me', type: 'campaign_expiring', message: '"Cozy Cafe Mornings" closes in 2 days. Submit your content soon.', app: 'a-3', read: true },
  { user: 'u-biz-me', type: 'new_application', message: 'Liam Carter applied to "Tasting Menu for Two".', campaign: 'c-1', read: false },
  { user: 'u-biz-me', type: 'submission_received', message: 'Chloe Tremblay submitted content for "Tasting Menu for Two".', app: 'a-12', read: false },
  { user: 'u-biz-me', type: 'new_application', message: 'Ethan Roy applied to "Weekend Brunch Feature".', campaign: 'c-2', read: true },
] as const;

// --- mutable store ------------------------------------------------------------

export interface Db {
  users: PublicUser[];
  businesses: BusinessProfile[];
  creators: CreatorProfile[];
  campaigns: Campaign[];
  applications: Application[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  reports: Report[];
  /** Map of email → userId, for the mock login handler. */
  credentials: Record<string, string>;
}

let db: Db | null = null;

function build(): Db {
  const userId = (k: string) => oid(k);
  const bizId = (k: string) => oid(k);
  const creatorId = (k: string) => oid(k);
  const campId = (k: string) => oid(k);
  const appId = (k: string) => oid(k);

  const users: PublicUser[] = USERS_SRC.map((u) => ({
    _id: userId(u.key),
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar ?? null,
    isVerified: true,
    isOnboarded: true,
    isBanned: false,
    pushToken: null,
    notificationPrefs: { push: true, email: true },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));

  const businesses: BusinessProfile[] = BUSINESSES_SRC.map((b) => ({
    _id: bizId(b.key),
    userId: userId(b.user),
    businessName: b.businessName,
    description: b.description,
    category: b.category,
    location: { city: b.city, state: b.state, country: 'Canada' },
    website: b.website,
    socialLinks: { instagram: b.instagram },
    logo: b.logo,
    isVerified: b.isVerified,
    isSuspended: false,
    totalCampaigns: b.totalCampaigns,
    totalCollabsCompleted: b.totalCollabsCompleted,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));

  const creators: CreatorProfile[] = CREATORS_SRC.map((c) => ({
    _id: creatorId(c.key),
    userId: userId(c.user),
    bio: c.bio,
    niche: [...c.niche],
    location: { city: c.city, state: c.state, country: 'Canada' },
    socialHandles: c.social,
    contentTypes: [...c.contentTypes],
    portfolio: c.portfolio.map((imageUrl) => ({ imageUrl })),
    totalCollabsCompleted: c.collabs,
    totalRewardsEarned: c.earned,
    isUGCOnly: c.ugc,
    isVerified: true,
    isSuspended: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));

  const campaigns: Campaign[] = CAMPAIGNS_SRC.map((c) => {
    const apps = APPLICATIONS_SRC.filter((a) => a.campaign === c.key);
    return {
      _id: campId(c.key),
      businessId: bizId(c.biz),
      title: c.title,
      description: c.description,
      category: c.category,
      location: c.isRemote
        ? undefined
        : mockCampaignLocation({ city: c.city, state: c.state, key: c.key }),
      isRemote: c.isRemote,
      reward: c.reward,
      deliverables: c.deliverables.map((d) => ({
        ...d,
        quantity: 'quantity' in d ? d.quantity : 1,
      })),
      deadline: at(c.deadline),
      minFollowers: c.minFollowers,
      status: c.status,
      tags: [...c.tags],
      coverImage: c.cover,
      applicationsCount: apps.length,
      isFeatured: c.featured,
      isSpam: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  });

  const applications: Application[] = APPLICATIONS_SRC.map((a) => ({
    _id: appId(a.key),
    campaignId: campId(a.campaign),
    creatorId: creatorId(a.creator),
    businessId: bizId(a.biz),
    pitch: a.pitch,
    status: a.status as ApplicationStatus,
    submissionLink: 'submissionLink' in a ? a.submissionLink : undefined,
    submissionNote: 'submissionNote' in a ? a.submissionNote : undefined,
    submittedAt: 'submittedAt' in a && a.submittedAt != null ? at(a.submittedAt) : undefined,
    verifiedAt: 'verifiedAt' in a && a.verifiedAt != null ? at(a.verifiedAt) : undefined,
    verifiedBy: 'verifiedBy' in a && a.verifiedBy ? userId(a.verifiedBy) : undefined,
    businessNote: 'businessNote' in a ? a.businessNote : undefined,
    conversationId:
      a.status === 'Accepted' || a.status === 'Completed' ? oid(`conv-${a.key}`) : undefined,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));

  // A conversation per accepted/completed application (the collab connection).
  const conversations: Conversation[] = APPLICATIONS_SRC.filter(
    (a) => a.status === 'Accepted' || a.status === 'Completed',
  ).map((a) => {
    const biz = BUSINESSES_SRC.find((b) => b.key === a.biz)!;
    const cre = CREATORS_SRC.find((c) => c.key === a.creator)!;
    const camp = CAMPAIGNS_SRC.find((c) => c.key === a.campaign)!;
    return {
      _id: oid(`conv-${a.key}`),
      applicationId: appId(a.key),
      campaignId: campId(a.campaign),
      campaignTitle: camp.title,
      businessUserId: userId(biz.user),
      creatorUserId: userId(cre.user),
      lastMessage: undefined,
      lastMessageAt: undefined,
      lastSenderUserId: undefined,
      unreadCount: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  });

  const notifications: Notification[] = NOTIFS_SRC.map((n, i) => {
    const link =
      'app' in n && n.app
        ? `/dashboard/creator/collabs/${appId(n.app)}`
        : 'campaign' in n && n.campaign
          ? `/campaign/${campId(n.campaign)}`
          : '/';
    return {
      _id: oid(`notif-${i}`),
      userId: userId(n.user),
      type: n.type,
      message: n.message,
      deepLinkPath: link,
      isRead: n.read,
      createdAt: at(-i),
    };
  });

  const reports: Report[] = [
    { _id: oid('rep-1'), reporterId: userId('u-creator-3'), targetType: 'campaign', targetId: campId('c-5'), reason: 'Reward not delivered after submission.', status: 'open', resolvedBy: null, resolvedAt: null, createdAt: nowIso(), updatedAt: nowIso() },
    { _id: oid('rep-2'), reporterId: userId('u-creator-2'), targetType: 'business', targetId: bizId('bp-3'), reason: 'Unresponsive after accepting.', status: 'open', resolvedBy: null, resolvedAt: null, createdAt: nowIso(), updatedAt: nowIso() },
  ];

  const credentials: Record<string, string> = {};
  for (const u of USERS_SRC) credentials[u.email.toLowerCase()] = userId(u.key);

  return {
    users,
    businesses,
    creators,
    campaigns,
    applications,
    conversations,
    messages: [],
    notifications,
    reports,
    credentials,
  };
}

/** The current in-memory store (built lazily on first access). */
export function getDb(): Db {
  db ??= build();
  return db;
}

/** Rebuild the dataset from scratch (fresh deadlines, no mutations). */
export function resetDb(): void {
  db = build();
}

// --- selectors / joins --------------------------------------------------------

export function userSummary(userId: string): UserSummary | undefined {
  const u = getDb().users.find((x) => x._id === userId);
  if (!u) return undefined;
  return { _id: u._id, name: u.name, avatar: u.avatar ?? null, role: u.role, createdAt: u.createdAt };
}

/** Join a campaign with its business profile. */
export function publicCampaign(c: Campaign): PublicCampaign {
  const business = getDb().businesses.find((b) => b._id === c.businessId);
  return business ? { ...c, business } : { ...c };
}

/** Join an application with campaign / creator / creatorUser / business. */
export function publicApplication(a: Application): PublicApplication {
  const d = getDb();
  const campaign = d.campaigns.find((c) => c._id === a.campaignId);
  const creator = d.creators.find((c) => c._id === a.creatorId);
  const business = d.businesses.find((b) => b._id === a.businessId);
  const out: PublicApplication = { ...a };
  if (campaign) out.campaign = publicCampaign(campaign);
  if (creator) {
    out.creator = creator;
    const summary = userSummary(creator.userId);
    if (summary) out.creatorUser = summary;
  }
  if (business) out.business = business;
  return out;
}

/** The CreatorProfile / BusinessProfile id owned by a user (for scoping). */
export function profileIdForUser(userId: string): { role: string; profileId?: string } {
  const d = getDb();
  const user = d.users.find((u) => u._id === userId);
  if (!user) return { role: 'guest' };
  if (user.role === 'creator') {
    return { role: 'creator', profileId: d.creators.find((c) => c.userId === userId)?._id };
  }
  if (user.role === 'business') {
    return { role: 'business', profileId: d.businesses.find((b) => b.userId === userId)?._id };
  }
  return { role: user.role };
}
