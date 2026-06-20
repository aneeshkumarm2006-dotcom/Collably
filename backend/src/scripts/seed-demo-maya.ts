/**
 * Additive demo seeder for chat — creates the seeded creator `maya@collably.app`
 * plus three demo businesses/campaigns/accepted collabs, then fills each collab's
 * chat thread with realistic messages.
 *
 * SAFE / idempotent: everything is upserted (keyed by email / unique fields) and
 * NOTHING is deleted — existing real accounts are untouched. Re-running won't
 * duplicate (conversations with messages are skipped).
 *
 *   npm run build && node dist/backend/src/scripts/seed-demo-maya.js
 *   (MONGODB_URI is read from backend/.env via dotenv.)
 */
import { connectDB, disconnectDB } from '../lib/db';
import { hashPassword } from '../lib/password';
import { User } from '../models/User';
import { CreatorProfile } from '../models/CreatorProfile';
import { BusinessProfile } from '../models/BusinessProfile';
import { Campaign } from '../models/Campaign';
import { Application } from '../models/Application';
import { Message } from '../models/Message';
import { getOrCreateConversationForApplication } from '../lib/conversations';

const PASSWORD = 'Password123';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (days: number) => new Date(Date.now() + days * DAY);

type Line = { from: 'business' | 'creator'; body: string };

const COLLABS: {
  bizEmail: string;
  bizName: string;
  category: string;
  city: string;
  state: string;
  campaign: { title: string; description: string; reward: { type: string; description: string; estimatedValue: number }; deliverables: any[]; minFollowers: number; tags: string[]; cover: string };
  status: 'Accepted' | 'Completed';
  pitch: string;
  startedAgo: number;
  lines: Line[];
}[] = [
  {
    bizEmail: 'peak@collably.app',
    bizName: 'Peak Fitness Studio',
    category: 'Fitness',
    city: 'Vancouver',
    state: 'British Columbia',
    campaign: {
      title: '30-Day Fitness Challenge',
      description: 'Document a 30-day transformation with a free studio membership. Weekly reels.',
      reward: { type: 'Service', description: '1-month studio membership', estimatedValue: 150 },
      deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 4 }],
      minFollowers: 5000,
      tags: ['fitness', 'challenge'],
      cover: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800',
    },
    status: 'Accepted',
    pitch: 'Ready to document the full 30 days!',
    startedAgo: 2 * HOUR,
    lines: [
      { from: 'business', body: "Hi Maya! 🎉 You're in for the 30-Day Fitness Challenge — so excited to have you!" },
      { from: 'creator', body: "Thank you! Can't wait to start 💪 When does day 1 begin?" },
      { from: 'business', body: 'Monday! Your membership is active now — drop in anytime. We need 1 reel each week (4 total).' },
      { from: 'creator', body: "Perfect. I'll film an intro reel for week 1 and tag @peakfitness." },
      { from: 'business', body: 'Love it. The front desk has your welcome kit ready 🙌' },
      { from: 'creator', body: 'Picked it up — the studio looks amazing 😍 Starting tomorrow!' },
      { from: 'business', body: "Let's gooo 🔥" },
    ],
  },
  {
    bizEmail: 'brew@collably.app',
    bizName: 'Brew & Chapter',
    category: 'Cafe',
    city: 'Ottawa',
    state: 'Ontario',
    campaign: {
      title: 'Cozy Cafe Mornings',
      description: 'Capture a slow morning at our book café — coffee, books, soft light.',
      reward: { type: 'Voucher', description: 'Café dining voucher', estimatedValue: 45 },
      deliverables: [
        { platform: 'Instagram', contentType: 'Photo', quantity: 3 },
        { platform: 'Instagram', contentType: 'Story', quantity: 2 },
      ],
      minFollowers: 0,
      tags: ['cafe', 'cosy', 'ottawa'],
      cover: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800',
    },
    status: 'Accepted',
    pitch: 'Cosy mornings are my whole vibe.',
    startedAgo: 20 * HOUR,
    lines: [
      { from: 'business', body: 'Hey Maya! Approved for Cozy Cafe Mornings ☕ Come by any morning this week.' },
      { from: 'creator', body: "Yay! I'll come Saturday around 9am for the soft light." },
      { from: 'business', body: "Perfect — ask for Sam, coffee's on us. 3 photos + 2 stories, tag @brewchapter 📚" },
      { from: 'creator', body: "Done! Posted 3 photos + 2 stories this morning, link's in the submission tab ✨" },
      { from: 'business', body: 'They look stunning 😍 Approved — thank you so much!' },
    ],
  },
  {
    bizEmail: 'thread@collably.app',
    bizName: 'Thread & Co.',
    category: 'Fashion',
    city: 'Toronto',
    state: 'Ontario',
    campaign: {
      title: 'Festive Fashion Haul',
      description: 'Style our festive collection your way. Pick any 3 pieces to keep.',
      reward: { type: 'Product', description: '3 festive outfits', estimatedValue: 300 },
      deliverables: [
        { platform: 'Instagram', contentType: 'Reel', quantity: 1 },
        { platform: 'YouTube', contentType: 'Short', quantity: 1 },
      ],
      minFollowers: 6000,
      tags: ['fashion', 'festive', 'haul'],
      cover: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    },
    status: 'Completed',
    pitch: 'Festive styling is my favourite.',
    startedAgo: 5 * DAY,
    lines: [
      { from: 'business', body: 'Hi Maya! The Festive Fashion Haul is all yours 🎁 Pick any 3 pieces to keep.' },
      { from: 'creator', body: 'Eee thank you! Going with the emerald slip dress, the knit set, and the long coat 🧥' },
      { from: 'business', body: 'Great picks — shipping today. 1 reel + 1 YouTube short, your style.' },
      { from: 'creator', body: 'Reel + short are live! Tagged @threadco in both 💚' },
      { from: 'business', body: 'Obsessed with how it turned out — marking this complete. Loved working with you!' },
      { from: 'creator', body: 'Likewise! Hope we collab again soon 🙌' },
    ],
  },
];

async function upsertUser(email: string, name: string, role: 'creator' | 'business', passwordHash: string) {
  return User.findOneAndUpdate(
    { email },
    { $set: { name, role, isVerified: true, isOnboarded: true }, $setOnInsert: { email, passwordHash } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function main() {
  await connectDB();
  const passwordHash = await hashPassword(PASSWORD);

  // ── creator: maya ──
  const maya = await upsertUser('maya@collably.app', 'Maya Bennett', 'creator', passwordHash);
  const mayaProfile = await CreatorProfile.findOneAndUpdate(
    { userId: maya._id },
    {
      $set: {
        bio: 'Toronto lifestyle + food creator sharing honest, cosy stories.',
        niche: ['Lifestyle', 'Food', 'Fashion'],
        location: { city: 'Toronto', state: 'Ontario', country: 'Canada' },
        socialHandles: { instagram: { handle: '@mayabennett', link: 'https://instagram.com/mayabennett', followerCount: 18400 } },
        contentTypes: ['Reel', 'Story', 'Photo'],
        isUGCOnly: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  let created = 0;
  let skipped = 0;

  for (const collab of COLLABS) {
    // ── business + profile ──
    const bizUser = await upsertUser(collab.bizEmail, collab.bizName, 'business', passwordHash);
    const bizProfile = await BusinessProfile.findOneAndUpdate(
      { userId: bizUser._id },
      {
        $set: {
          businessName: collab.bizName,
          description: `${collab.bizName} — demo brand for chat.`,
          category: collab.category,
          location: { city: collab.city, state: collab.state, country: 'Canada' },
          isVerified: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // ── campaign ──
    const camp = await Campaign.findOneAndUpdate(
      { businessId: bizProfile._id, title: collab.campaign.title },
      {
        $set: {
          description: collab.campaign.description,
          category: collab.category,
          isRemote: false,
          location: { city: collab.city, state: collab.state, country: 'Canada' },
          reward: collab.campaign.reward,
          deliverables: collab.campaign.deliverables,
          deadline: at(20),
          minFollowers: collab.campaign.minFollowers,
          status: 'Active',
          tags: collab.campaign.tags,
          coverImage: collab.campaign.cover,
          isFeatured: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // ── application (accepted/completed) ──
    const app = await Application.findOneAndUpdate(
      { campaignId: camp._id, creatorId: mayaProfile._id },
      {
        $set: {
          businessId: bizProfile._id,
          status: collab.status,
          pitch: collab.pitch,
          ...(collab.status === 'Completed'
            ? { submittedAt: at(-6), verifiedAt: at(-4), verifiedBy: bizUser._id, businessNote: 'Loved it — thank you!' }
            : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // ── conversation + messages ──
    const convo = await getOrCreateConversationForApplication(app as any);
    if (!convo) {
      console.warn(`  – could not open thread for ${collab.campaign.title}`);
      continue;
    }
    const existing = await Message.countDocuments({ conversationId: convo._id });
    if (existing > 0) {
      skipped += 1;
      console.log(`  ↷ "${collab.campaign.title}" already has ${existing} message(s) — skipping.`);
      continue;
    }

    const base = Date.now() - collab.startedAgo;
    let last: Line = collab.lines[0];
    let lastAt = new Date(base);
    for (let i = 0; i < collab.lines.length; i += 1) {
      const line = collab.lines[i];
      const senderUserId = line.from === 'business' ? convo.businessUserId : convo.creatorUserId;
      const when = new Date(base + i * 4 * 60 * 1000);
      const msg = await Message.create({ conversationId: convo._id, senderUserId, senderRole: line.from, body: line.body });
      await Message.collection.updateOne({ _id: msg._id }, { $set: { createdAt: when } });
      last = line;
      lastAt = when;
    }

    convo.lastMessage = last.body;
    convo.lastMessageAt = lastAt;
    convo.lastSenderUserId = last.from === 'business' ? convo.businessUserId : convo.creatorUserId;
    if (last.from === 'business') {
      convo.unreadByCreator = 1;
      convo.unreadByBusiness = 0;
    } else {
      convo.unreadByCreator = 0;
      convo.unreadByBusiness = 1;
    }
    await convo.save();

    created += 1;
    console.log(`  ✓ Seeded "${collab.campaign.title}" (${collab.lines.length} messages).`);
  }

  console.log(`\nDone. Created ${created} chat thread(s), skipped ${skipped}.`);
  console.log('Log in as maya@collably.app (password: Password123) → Messages tab.');
}

main()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Demo seed failed:', err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
