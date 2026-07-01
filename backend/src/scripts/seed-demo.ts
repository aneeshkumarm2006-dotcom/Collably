/**
 * Minimal DEMO seed — a clean two-account world for recording a walkthrough.
 *
 * Wipes everything, then creates exactly:
 *   • 1 creator   → prem@gmail.com   (verified)
 *   • 1 business  → aneesh@gmail.com (verified, brand "Aneesh Electronics")
 *   • 2 campaigns owned by the business (different cities, geocoded → map pins)
 *   • 1 accepted collab: prem accepted on campaign #1
 *   • 1 open chat between them, with a short starter thread
 *
 * Both logins use the password "Password".
 *
 * ⚠️ DESTRUCTIVE: deletes ALL users/profiles/campaigns/applications/chats/etc.
 * Guarded behind ALLOW_DESTRUCTIVE_SEED=true so it can't run by accident.
 *
 *   ALLOW_DESTRUCTIVE_SEED=true npx ts-node --transpile-only src/scripts/seed-demo.ts
 *   (MONGODB_URI + GOOGLE_GEOCODING_API_KEY are read from backend/.env via dotenv.)
 */
import { connectDB, disconnectDB } from '../lib/db';
import { hashPassword } from '../lib/password';
import {
  User,
  BusinessProfile,
  CreatorProfile,
  Campaign,
  Application,
  Notification,
  Report,
} from '../models';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { getOrCreateConversationForApplication } from '../lib/conversations';
import { forwardGeocode, isGeocodingConfigured } from '../services';

const PASSWORD = 'Password';
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
/** Face-cropped, square, high-quality avatar — stays sharp in the circular frame. */
const face = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=facearea&facepad=3&w=600&h=600&q=90`;
const at = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const info = (m: string) => console.log(m);

/** Geocode a place → coordinates, with a hard-coded fallback so a pin always shows. */
async function geo(
  city: string,
  state: string,
  country: string,
  fallback: { lat: number; lng: number },
): Promise<{ lat: number; lng: number }> {
  if (isGeocodingConfigured()) {
    try {
      const r = await forwardGeocode(`${city}, ${state}, ${country}`);
      if (r) return { lat: r.lat, lng: r.lng };
    } catch {
      /* fall through to the fallback */
    }
  }
  return fallback;
}

async function wipe(): Promise<void> {
  await Promise.all([
    User.deleteMany({}),
    BusinessProfile.deleteMany({}),
    CreatorProfile.deleteMany({}),
    Campaign.deleteMany({}),
    Application.deleteMany({}),
    Notification.deleteMany({}),
    Report.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
  ]);
  info('  ✓ wiped all collections');
}

async function main(): Promise<void> {
  info('Seed — minimal demo world (prem + aneesh)');
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    console.error(
      'Refusing to run: this deletes ALL data. Re-run with ALLOW_DESTRUCTIVE_SEED=true to confirm.',
    );
    process.exit(1);
  }
  await connectDB();
  await wipe();

  const passwordHash = await hashPassword(PASSWORD);

  // ── Users ──────────────────────────────────────────────────────────────────
  const premUser = await User.create({
    name: 'Prem',
    email: 'prem@gmail.com',
    passwordHash,
    role: 'creator',
    avatar: face('1500648767791-00dcc994a43e'),
    isVerified: true,
    isOnboarded: true,
  } as any);

  const aneeshUser = await User.create({
    name: 'Aneesh Kumar',
    email: 'aneesh@gmail.com',
    passwordHash,
    role: 'business',
    avatar: img('1531297484001-80022131f5a1'),
    isVerified: true,
    isOnboarded: true,
  } as any);

  // ── Profiles (both verified so the flows aren't gated) ──────────────────────
  const premProfile = await CreatorProfile.create({
    userId: premUser._id,
    bio: 'Hyderabad tech creator — crisp unboxings, honest reviews and clean UGC.',
    niche: ['Tech', 'Lifestyle'],
    location: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
    socialHandles: {
      instagram: {
        handle: 'prem.creates',
        link: 'https://instagram.com/prem.creates',
        followerCount: 12500,
        engagementRate: 5.4,
      },
      youtube: { handle: 'PremCreates', link: 'https://youtube.com/@PremCreates', subscriberCount: 5200 },
    },
    contentTypes: ['Reel', 'Review', 'UGC'],
    portfolio: [
      img('1505740420928-5e560c06d30e'),
      img('1523275335684-37898b6baf30'),
      img('1542291026-7eec264c27ff'),
    ].map((imageUrl) => ({ imageUrl })),
    totalCollabsCompleted: 0,
    totalRewardsEarned: 0,
    isUGCOnly: false,
    isVerified: true,
  } as any);

  const aneeshProfile = await BusinessProfile.create({
    userId: aneeshUser._id,
    businessName: 'Aneesh Electronics',
    description:
      'Audio & wearables brand in Hyderabad. We collab with tech creators for honest unboxings and reviews.',
    category: 'Tech',
    location: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
    website: 'https://aneeshelectronics.in',
    socialLinks: { instagram: 'aneesh.electronics' },
    logo: img('1531297484001-80022131f5a1'),
    isVerified: true,
    totalCampaigns: 2,
    totalCollabsCompleted: 0,
  } as any);

  // ── Campaigns (different cities → distinct location-search results + map pins) ─
  const hyderabad = await geo('Hyderabad', 'Telangana', 'India', { lat: 17.385, lng: 78.4867 });
  const warangal = await geo('Warangal', 'Telangana', 'India', { lat: 17.9689, lng: 79.5941 });

  const headphones = await Campaign.create({
    businessId: aneeshProfile._id,
    title: 'Wireless headphones — unboxing & first impressions',
    description:
      'Unbox our new wireless headphones and share your honest first impressions. Keep the headphones as your reward.',
    category: 'Tech',
    isRemote: false,
    location: { city: 'Hyderabad', state: 'Telangana', country: 'India', coordinates: hyderabad },
    reward: { type: 'Product', description: 'Keep the wireless headphones', estimatedValue: 1000 },
    deliverables: [
      { platform: 'Instagram', contentType: 'Reel', quantity: 1, requirements: 'Tag @aneesh.electronics, 20s+' },
      { platform: 'Instagram', contentType: 'Story', quantity: 2 },
    ],
    deadline: at(12),
    minFollowers: 0,
    status: 'Active',
    tags: ['tech', 'unboxing', 'headphones', 'hyderabad'],
    coverImage: img('1505740420928-5e560c06d30e'),
    isFeatured: true,
  } as any);

  await Campaign.create({
    businessId: aneeshProfile._id,
    title: 'Smartwatch review reel',
    description:
      'A clean review reel of our new smartwatch — fitness tracking, battery life, and daily wear.',
    category: 'Tech',
    isRemote: false,
    location: { city: 'Warangal', state: 'Telangana', country: 'India', coordinates: warangal },
    reward: { type: 'Product', description: 'Keep the smartwatch', estimatedValue: 1500 },
    deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1 }],
    deadline: at(20),
    minFollowers: 0,
    status: 'Active',
    tags: ['tech', 'smartwatch', 'review', 'warangal'],
    coverImage: img('1523275335684-37898b6baf30'),
    isFeatured: false,
  } as any);

  // ── The collab: prem accepted on the headphones campaign ────────────────────
  const application = await Application.create({
    campaignId: headphones._id,
    creatorId: premProfile._id,
    businessId: aneeshProfile._id,
    status: 'Accepted',
    pitch:
      'I make crisp tech unboxing reels for an engaged Hyderabad audience — would love to feature these headphones.',
  } as any);

  // ── The open chat for that collab ───────────────────────────────────────────
  const convo = await getOrCreateConversationForApplication(application);
  if (!convo) throw new Error('Could not open the conversation for the seeded collab.');
  application.conversationId = convo._id;
  await application.save();

  const lines: { from: 'business' | 'creator'; body: string }[] = [
    { from: 'business', body: "Hey Prem! 🎉 You're in for the headphones unboxing — welcome aboard!" },
    { from: 'creator', body: 'Thank you! Excited to shoot this 🎧 When will the headphones reach me?' },
    { from: 'business', body: 'Shipping today — should reach Hyderabad in ~2 days. 1 reel + 2 stories, tag @aneesh.electronics 🙌' },
    { from: 'creator', body: "Perfect — I'll send a draft for approval before posting ✨" },
    { from: 'business', body: 'Sounds great, looking forward to it!' },
  ];

  const base = Date.now() - 3 * 60 * 60 * 1000; // thread started ~3h ago
  let lastAt = new Date(base);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const senderUserId = line.from === 'business' ? convo.businessUserId : convo.creatorUserId;
    lastAt = new Date(base + i * 4 * 60 * 1000); // 4 min apart
    const msg = await Message.create({
      conversationId: convo._id,
      senderUserId,
      senderRole: line.from,
      body: line.body,
    });
    await Message.collection.updateOne({ _id: msg._id }, { $set: { createdAt: lastAt } });
  }

  const last = lines[lines.length - 1];
  convo.lastMessage = last.body;
  convo.lastMessageAt = lastAt;
  convo.lastSenderUserId = last.from === 'business' ? convo.businessUserId : convo.creatorUserId;
  convo.unreadByCreator = last.from === 'business' ? 1 : 0; // prem sees a badge
  convo.unreadByBusiness = last.from === 'creator' ? 1 : 0;
  await convo.save();

  info('\n  ✓ seeded:');
  info('     creator   → prem@gmail.com   (password: Password)');
  info('     business  → aneesh@gmail.com (password: Password)');
  info('     campaigns → 2 (Hyderabad headphones [collab], Warangal smartwatch)');
  info('     collab    → prem accepted on the headphones campaign, chat open with 5 messages');
}

main()
  .then(async () => {
    await disconnectDB();
    info('\nDone.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Demo seed failed:', err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
