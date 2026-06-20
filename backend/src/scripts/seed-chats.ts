/**
 * Additive chat seeder — inserts realistic dummy conversations + messages for the
 * seeded creator (maya@collably.app) on her accepted/completed collabs.
 *
 * SAFE: this does NOT wipe anything (unlike `seed.ts`). It reuses the app's own
 * `getOrCreateConversationForApplication` helper so conversations match the real
 * schema, and it is idempotent — a conversation that already has messages is
 * skipped, so re-running won't duplicate.
 *
 *   npm run build && MONGODB_URI="mongodb+srv://…" node dist/backend/src/scripts/seed-chats.js
 *   (MONGODB_URI is read from backend/.env automatically via dotenv.)
 */
import { connectDB, disconnectDB } from '../lib/db';
import { User } from '../models/User';
import { CreatorProfile } from '../models/CreatorProfile';
import { Application } from '../models/Application';
import { Message } from '../models/Message';
import { getOrCreateConversationForApplication } from '../lib/conversations';

const CREATOR_EMAIL = 'maya@collably.app';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Line = { from: 'business' | 'creator'; body: string };

/** Themed scripts chosen by a keyword in the campaign title. */
const SCRIPTS: { match: (title: string) => boolean; startedAgo: number; lines: Line[] }[] = [
  {
    match: (t) => /fitness|challenge/i.test(t),
    startedAgo: 2 * HOUR, // most recent → sorts to top
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
    match: (t) => /cafe|café|cozy|cosy|morning|brew/i.test(t),
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
    match: (t) => /fashion|haul|style|wardrobe/i.test(t),
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

const GENERIC: Line[] = [
  { from: 'business', body: "Hi Maya! 🎉 You're approved for this collab — welcome aboard!" },
  { from: 'creator', body: 'Thank you so much! Excited to get started 😊 What are the next steps?' },
  { from: 'business', body: "I'll share the brief shortly. Looking forward to your content!" },
  { from: 'creator', body: 'Perfect — will send a draft for approval before posting.' },
];

async function main() {
  await connectDB();

  const maya = await User.findOne({ email: CREATOR_EMAIL });
  if (!maya) {
    console.error(`✗ No user found for ${CREATOR_EMAIL}. Seed the base data first (npm run seed) or pick another account.`);
    return;
  }
  const profile = await CreatorProfile.findOne({ userId: maya._id }).select('_id');
  if (!profile) {
    console.error(`✗ ${CREATOR_EMAIL} has no creator profile.`);
    return;
  }

  const apps = await Application.find({
    creatorId: profile._id,
    status: { $in: ['Accepted', 'Completed'] },
  });
  console.log(`Found ${apps.length} accepted/completed collab(s) for ${CREATOR_EMAIL}.`);

  let created = 0;
  let skipped = 0;

  for (const app of apps) {
    const convo = await getOrCreateConversationForApplication(app);
    if (!convo) {
      console.warn(`  – could not open a thread for application ${app._id} (missing profile).`);
      continue;
    }

    const existing = await Message.countDocuments({ conversationId: convo._id });
    if (existing > 0) {
      skipped += 1;
      console.log(`  ↷ "${convo.campaignTitle ?? convo._id}" already has ${existing} message(s) — skipping.`);
      continue;
    }

    const title = convo.campaignTitle ?? '';
    const script = SCRIPTS.find((s) => s.match(title));
    const lines = script?.lines ?? GENERIC;
    const startedAgo = script?.startedAgo ?? 6 * HOUR;
    const base = Date.now() - startedAgo;

    let last: Line | null = null;
    let lastAt = new Date(base);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const senderUserId = line.from === 'business' ? convo.businessUserId : convo.creatorUserId;
      const at = new Date(base + i * 4 * 60 * 1000); // 4 min apart
      const msg = await Message.create({
        conversationId: convo._id,
        senderUserId,
        senderRole: line.from,
        body: line.body,
      });
      // Backdate createdAt for a realistic timeline (Mongoose timestamps set it to now).
      await Message.collection.updateOne({ _id: msg._id }, { $set: { createdAt: at } });
      last = line;
      lastAt = at;
    }

    // Update the thread summary + unread badge for whoever didn't send last.
    convo.lastMessage = last?.body;
    convo.lastMessageAt = lastAt;
    convo.lastSenderUserId = last?.from === 'business' ? convo.businessUserId : convo.creatorUserId;
    if (last?.from === 'business') {
      convo.unreadByCreator = 1; // maya sees a badge
      convo.unreadByBusiness = 0;
    } else {
      convo.unreadByCreator = 0;
      convo.unreadByBusiness = 1;
    }
    await convo.save();

    created += 1;
    console.log(`  ✓ Seeded "${title}" with ${lines.length} messages.`);
  }

  console.log(`\nDone. Created ${created} thread(s), skipped ${skipped} existing.`);
  console.log(`Log in as ${CREATOR_EMAIL} (password: Password123) → Messages tab to see them.`);
}

main()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Chat seed failed:', err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
