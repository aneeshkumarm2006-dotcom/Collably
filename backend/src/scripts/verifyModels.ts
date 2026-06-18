/**
 * Phase 3 checkpoint script — proves every Mongoose model compiles, validates,
 * and (when a database is reachable) can be created and read back.
 *
 * Run it two ways:
 *   • Offline (no DB):  validates a sample document of each model with
 *     `validateSync()` and prints the indexes each schema declares. No
 *     connection needed — exercises enums, required fields, and defaults.
 *   • Online (MONGODB_URI set): additionally connects, inserts one linked
 *     document per model (User → profiles → Campaign → Application →
 *     Notification), reads them back, then cleans up.
 *
 * Usage:
 *   npm run build && npm run verify:models
 *   # or with a database:
 *   MONGODB_URI="mongodb+srv://..." npm run verify:models
 */
import mongoose, { type Model } from 'mongoose';
import { connectDB, disconnectDB, isDbConnected } from '../lib/db';
import {
  User,
  BusinessProfile,
  CreatorProfile,
  Campaign,
  Application,
  Notification,
} from '../models';

/** Pretty console helpers — no dependency on a logger. */
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const info = (msg: string) => console.log(msg);

/** Validate a sample doc offline and report the schema's indexes. */
function checkSchema<T>(name: string, m: Model<T>, sample: Partial<T>): void {
  const doc = new m(sample as T);
  const err = doc.validateSync();
  if (err) {
    throw new Error(`${name} failed validation: ${err.message}`);
  }
  const indexes = m.schema.indexes();
  ok(`${name}: validates; ${indexes.length} index(es) declared`);
  for (const [fields, options] of indexes) {
    const unique = options && (options as { unique?: boolean }).unique ? ' [unique]' : '';
    info(`      index ${JSON.stringify(fields)}${unique}`);
  }
}

/** Offline pass — runs with or without a database. */
function validateAll(): void {
  info('\n[1] Offline schema validation');

  const userId = new mongoose.Types.ObjectId();
  const businessId = new mongoose.Types.ObjectId();
  const creatorId = new mongoose.Types.ObjectId();
  const campaignId = new mongoose.Types.ObjectId();

  checkSchema('User', User, {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'creator',
  });
  checkSchema('BusinessProfile', BusinessProfile, {
    userId,
    businessName: 'Bean Scene Cafe',
    category: 'Cafe',
  });
  checkSchema('CreatorProfile', CreatorProfile, {
    userId,
    niche: ['Food', 'Lifestyle'],
    contentTypes: ['Reel', 'UGC'],
  });
  checkSchema('Campaign', Campaign, {
    businessId,
    title: 'Free brunch for a Reel',
    description: 'Make a 60s Reel at our cafe.',
    category: 'Cafe',
    reward: { type: 'Experience', description: 'Brunch for two' },
  });
  checkSchema('Application', Application, {
    campaignId,
    creatorId,
    businessId,
    pitch: 'I post weekly food Reels to 12k followers.',
  });
  checkSchema('Notification', Notification, {
    userId,
    type: 'application_accepted',
    message: "You've been accepted to Free brunch for a Reel.",
    deepLinkPath: `/campaign/${campaignId.toString()}`,
  });
}

/** Online pass — only runs when a live connection is established. */
async function createReadRoundTrip(): Promise<void> {
  info('\n[2] Online create/read round-trip');

  const stamp = Date.now();
  // Create a linked graph: user → business + creator profiles → campaign →
  // application → notification.
  const businessUser = await User.create({
    name: 'Bean Scene Owner',
    email: `owner+${stamp}@example.com`,
    role: 'business',
  });
  const creatorUser = await User.create({
    name: 'Ada Lovelace',
    email: `ada+${stamp}@example.com`,
    role: 'creator',
  });
  ok(`Created 2 Users (${businessUser.id}, ${creatorUser.id})`);

  const business = await BusinessProfile.create({
    userId: businessUser._id,
    businessName: 'Bean Scene Cafe',
    category: 'Cafe',
    location: { city: 'Austin', state: 'TX', country: 'USA' },
  });
  const creator = await CreatorProfile.create({
    userId: creatorUser._id,
    bio: 'Food + lifestyle micro-creator',
    niche: ['Food', 'Lifestyle'],
    contentTypes: ['Reel', 'UGC'],
    socialHandles: {
      instagram: { handle: '@ada.eats', followerCount: 12000, engagementRate: 4.2 },
    },
  });
  ok(`Created BusinessProfile + CreatorProfile (${business.id}, ${creator.id})`);

  const campaign = await Campaign.create({
    businessId: business._id,
    title: 'Free brunch for a Reel',
    description: 'Make a 60-second Instagram Reel at our cafe.',
    category: 'Cafe',
    location: { city: 'Austin', state: 'TX', country: 'USA' },
    reward: { type: 'Experience', description: 'Brunch for two', estimatedValue: 60 },
    deliverables: [
      { platform: 'Instagram', contentType: 'Reel', quantity: 1, requirements: 'Tag @beanscene' },
    ],
    deadline: new Date(stamp + 14 * 24 * 60 * 60 * 1000),
    status: 'Active',
    tags: ['food', 'austin'],
  });
  ok(`Created Campaign (${campaign.id})`);

  const application = await Application.create({
    campaignId: campaign._id,
    creatorId: creator._id,
    businessId: business._id,
    pitch: 'I post weekly food Reels to 12k engaged followers.',
  });
  ok(`Created Application (${application.id})`);

  const notification = await Notification.create({
    userId: creatorUser._id,
    type: 'new_application',
    message: 'Your application was received.',
    deepLinkPath: `/campaign/${campaign.id}`,
  });
  ok(`Created Notification (${notification.id})`);

  // Read each back with a populated ref to prove relationships resolve.
  const readCampaign = await Campaign.findById(campaign._id).populate('businessId').lean();
  const readApplication = await Application.findById(application._id)
    .populate('campaignId creatorId')
    .lean();
  info(`      Campaign read back: "${readCampaign?.title}" status=${readCampaign?.status}`);
  info(`      Application read back: status=${readApplication?.status}`);

  // Verify the unique compound index blocks a duplicate application.
  try {
    await Application.create({
      campaignId: campaign._id,
      creatorId: creator._id,
      businessId: business._id,
      pitch: 'duplicate attempt',
    });
    throw new Error('Duplicate application was NOT rejected — unique index missing!');
  } catch (err) {
    const e = err as { code?: number; message: string };
    if (e.code === 11000) ok('Duplicate application correctly rejected (unique index works)');
    else throw err;
  }

  // Clean up everything we created.
  await Promise.all([
    User.deleteMany({ _id: { $in: [businessUser._id, creatorUser._id] } }),
    BusinessProfile.deleteOne({ _id: business._id }),
    CreatorProfile.deleteOne({ _id: creator._id }),
    Campaign.deleteOne({ _id: campaign._id }),
    Application.deleteMany({ campaignId: campaign._id }),
    Notification.deleteOne({ _id: notification._id }),
  ]);
  ok('Cleaned up all test documents');
}

async function main(): Promise<void> {
  info('Phase 3 — Mongoose model verification');

  validateAll();

  await connectDB();
  if (isDbConnected()) {
    await createReadRoundTrip();
    await disconnectDB();
  } else {
    info('\n[2] Online create/read round-trip — SKIPPED (no MONGODB_URI / DB unreachable).');
    info('    Set MONGODB_URI and re-run to exercise create/read against a real database.');
  }

  info('\nDone. All models compiled and validated.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[verifyModels] FAILED:', err instanceof Error ? err.message : err);
    void disconnectDB().finally(() => process.exit(1));
  });
