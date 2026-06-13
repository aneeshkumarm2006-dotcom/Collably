/**
 * Seed script — populates the database with realistic sample data so the API
 * (and, later, the mobile app) can be exercised end-to-end: an admin, several
 * businesses with campaigns, creators with profiles, and applications spanning
 * every lifecycle state (pending / accepted / submitted / completed / rejected),
 * plus a couple of open reports.
 *
 * ⚠️  DESTRUCTIVE: it wipes the User, *Profile, Campaign, Application,
 * Notification, and Report collections first. Intended for dev/staging only.
 *
 * Usage:
 *   npm run build && MONGODB_URI="mongodb+srv://..." npm run seed
 *
 * Every seeded login uses the password below; the script prints the accounts.
 */
import { connectDB, disconnectDB, isDbConnected } from '../lib/db';
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

const SEED_PASSWORD = 'Password123';

const info = (msg: string) => console.log(msg);

async function wipe(): Promise<void> {
  // Clear all documents (Atlas readWrite users can do this; dropDatabase is denied).
  await Promise.all([
    User.deleteMany({}),
    BusinessProfile.deleteMany({}),
    CreatorProfile.deleteMany({}),
    Campaign.deleteMany({}),
    Application.deleteMany({}),
    Notification.deleteMany({}),
    Report.deleteMany({}),
  ]);
  // Reconcile indexes with the current schema — this drops the old sparse-unique
  // googleId index and creates the partial one in its place, so seeding the many
  // users without a Google link no longer trips a duplicate-null collision.
  await Promise.all([
    User.syncIndexes(),
    BusinessProfile.syncIndexes(),
    CreatorProfile.syncIndexes(),
    Campaign.syncIndexes(),
    Application.syncIndexes(),
    Notification.syncIndexes(),
    Report.syncIndexes(),
  ]);
  info('  ✓ cleared collections + reconciled indexes');
}

async function main(): Promise<void> {
  info('Seed — Collably sample data');

  await connectDB();
  if (!isDbConnected()) {
    info('\nNo database connection (set MONGODB_URI). Aborting — nothing seeded.');
    process.exit(1);
  }

  await wipe();

  const passwordHash = await hashPassword(SEED_PASSWORD);

  // --- Admin -----------------------------------------------------------------
  const admin = await User.create({
    name: 'Platform Admin',
    email: 'admin@collably.app',
    passwordHash,
    role: 'admin',
    isVerified: true,
    isOnboarded: true,
  });

  // --- Businesses ------------------------------------------------------------
  const businessSeeds = [
    {
      name: 'Bean Scene Owner',
      email: 'business1@collably.app',
      businessName: 'Bean Scene Cafe',
      category: 'Cafe' as const,
      description: 'Specialty coffee + brunch in the city centre.',
      city: 'Bengaluru',
      isVerified: true,
    },
    {
      name: 'Glow Bar Owner',
      email: 'business2@collably.app',
      businessName: 'Glow Bar Studio',
      category: 'Salon & Spa' as const,
      description: 'Skincare facials and beauty treatments.',
      city: 'Mumbai',
      isVerified: false,
    },
    {
      name: 'FitFuel Owner',
      email: 'business3@collably.app',
      businessName: 'FitFuel Kitchen',
      category: 'Health & Wellness' as const,
      description: 'High-protein meal prep delivered fresh.',
      city: 'Bengaluru',
      isVerified: true,
    },
  ];

  const businesses = [];
  for (const b of businessSeeds) {
    const user = await User.create({
      name: b.name,
      email: b.email,
      passwordHash,
      role: 'business',
      isVerified: true,
      isOnboarded: true,
    });
    const profile = await BusinessProfile.create({
      userId: user._id,
      businessName: b.businessName,
      description: b.description,
      category: b.category,
      location: { city: b.city, country: 'India' },
      website: 'https://example.com',
      socialLinks: { instagram: `@${b.businessName.toLowerCase().replace(/\s+/g, '')}` },
      isVerified: b.isVerified,
    });
    businesses.push({ user, profile });
  }

  // --- Creators --------------------------------------------------------------
  const creatorSeeds = [
    {
      name: 'Ada Reels',
      email: 'creator1@collably.app',
      niche: ['Food', 'Lifestyle'],
      city: 'Bengaluru',
      followers: 12000,
      contentTypes: ['Reel', 'Post'],
      ugc: false,
    },
    {
      name: 'Bo Bytes',
      email: 'creator2@collably.app',
      niche: ['Tech', 'Gaming'],
      city: 'Hyderabad',
      followers: 4500,
      contentTypes: ['Short', 'Long Video'],
      ugc: false,
    },
    {
      name: 'Cy Glow',
      email: 'creator3@collably.app',
      niche: ['Beauty', 'Fashion'],
      city: 'Mumbai',
      followers: 38000,
      contentTypes: ['Reel', 'Story'],
      ugc: false,
    },
    {
      name: 'Dee Plates',
      email: 'creator4@collably.app',
      niche: ['Food'],
      city: 'Bengaluru',
      followers: 800,
      contentTypes: ['Photo', 'Review'],
      ugc: true,
    },
    {
      name: 'Eli Moves',
      email: 'creator5@collably.app',
      niche: ['Fitness', 'Health & Wellness'],
      city: 'Bengaluru',
      followers: 21000,
      contentTypes: ['Reel'],
      ugc: false,
    },
  ];

  const creators = [];
  for (const c of creatorSeeds) {
    const user = await User.create({
      name: c.name,
      email: c.email,
      passwordHash,
      role: 'creator',
      isVerified: true,
      isOnboarded: true,
    });
    const profile = await CreatorProfile.create({
      userId: user._id,
      bio: `${c.niche.join(' & ')} creator.`,
      niche: c.niche,
      location: { city: c.city, country: 'India' },
      socialHandles: {
        instagram: {
          handle: `@${c.name.toLowerCase().replace(/\s+/g, '')}`,
          followerCount: c.followers,
        },
      },
      contentTypes: c.contentTypes,
      isUGCOnly: c.ugc,
    });
    creators.push({ user, profile });
  }

  // --- Campaigns -------------------------------------------------------------
  const [beanScene, glowBar, fitFuel] = businesses;

  const campaignSeeds = [
    {
      biz: beanScene,
      title: 'Free Brunch for a Reel',
      description: 'Visit Bean Scene, enjoy a brunch on us, post a Reel featuring your dish.',
      category: 'Cafe' as const,
      reward: { type: 'Experience' as const, description: 'Brunch for two', estimatedValue: 1500 },
      deliverables: [{ platform: 'Instagram' as const, contentType: 'Reel' as const, quantity: 1 }],
      spotsTotal: 5,
      minFollowers: 1000,
      tags: ['Food', 'Lifestyle'],
      status: 'Active' as const,
      city: 'Bengaluru',
    },
    {
      biz: glowBar,
      title: 'Glow Facial Experience',
      description: 'Complimentary signature facial in exchange for a Story + Reel.',
      category: 'Salon & Spa' as const,
      reward: { type: 'Service' as const, description: 'Signature facial', estimatedValue: 3000 },
      deliverables: [
        { platform: 'Instagram' as const, contentType: 'Story' as const, quantity: 2 },
        { platform: 'Instagram' as const, contentType: 'Reel' as const, quantity: 1 },
      ],
      spotsTotal: 3,
      minFollowers: 10000,
      tags: ['Beauty', 'Fashion'],
      status: 'Active' as const,
      city: 'Mumbai',
    },
    {
      biz: fitFuel,
      title: 'Protein Box Tasting',
      description: 'A week of meals for an honest review video.',
      category: 'Health & Wellness' as const,
      reward: { type: 'Product' as const, description: '7-day meal plan', estimatedValue: 2800 },
      deliverables: [
        { platform: 'YouTube' as const, contentType: 'Long Video' as const, quantity: 1 },
      ],
      spotsTotal: 4,
      minFollowers: 0,
      tags: ['Fitness', 'Health & Wellness', 'Food'],
      status: 'Active' as const,
      city: 'Bengaluru',
    },
    {
      biz: fitFuel,
      title: 'Draft: Summer Smoothies',
      description: 'Not published yet.',
      category: 'Food & Beverage' as const,
      reward: { type: 'Voucher' as const, description: '₹500 voucher', estimatedValue: 500 },
      deliverables: [{ platform: 'Any' as const, contentType: 'Post' as const, quantity: 1 }],
      spotsTotal: 10,
      minFollowers: 0,
      tags: ['Food'],
      status: 'Draft' as const,
      city: 'Bengaluru',
    },
  ];

  const campaigns = [];
  for (const c of campaignSeeds) {
    const campaign = await Campaign.create({
      businessId: c.biz.profile._id,
      title: c.title,
      description: c.description,
      category: c.category,
      location: { city: c.city, country: 'India' },
      reward: c.reward,
      deliverables: c.deliverables,
      spotsTotal: c.spotsTotal,
      spotsRemaining: c.spotsTotal,
      minFollowers: c.minFollowers,
      tags: c.tags,
      status: c.status,
    });
    campaigns.push(campaign);
    await BusinessProfile.updateOne({ _id: c.biz.profile._id }, { $inc: { totalCampaigns: 1 } });
  }

  const [brunch, facial, protein] = campaigns;

  // --- Applications (every lifecycle state) ----------------------------------
  // Accepted (consumes a spot on the brunch campaign).
  await Application.create({
    campaignId: brunch._id,
    creatorId: creators[0].profile._id,
    businessId: beanScene.profile._id,
    pitch: 'Foodie with an engaged local audience — would love this!',
    status: 'Accepted',
  });
  // Pending on the brunch campaign.
  await Application.create({
    campaignId: brunch._id,
    creatorId: creators[3].profile._id,
    businessId: beanScene.profile._id,
    pitch: 'UGC creator, great close-up food photography.',
    status: 'Pending',
  });
  // Rejected on the brunch campaign.
  await Application.create({
    campaignId: brunch._id,
    creatorId: creators[1].profile._id,
    businessId: beanScene.profile._id,
    pitch: 'Tech creator (off-niche).',
    status: 'Rejected',
    businessNote: 'Looking for food-focused creators this round.',
  });
  await Campaign.updateOne(
    { _id: brunch._id },
    { $set: { spotsRemaining: brunch.spotsTotal - 1 }, $inc: { applicationsCount: 3 } },
  );

  // Accepted + submitted (awaiting verification) on the facial campaign.
  await Application.create({
    campaignId: facial._id,
    creatorId: creators[2].profile._id,
    businessId: glowBar.profile._id,
    pitch: 'Beauty creator, 38k followers in Mumbai.',
    status: 'Accepted',
    submissionLink: 'https://instagram.com/p/example-reel',
    submissionProof: 'https://res.cloudinary.com/demo/image/upload/proof.jpg',
    submissionNote: 'Posted the Reel + 2 Stories as agreed.',
    submittedAt: new Date(),
  });
  await Campaign.updateOne(
    { _id: facial._id },
    { $set: { spotsRemaining: facial.spotsTotal - 1 }, $inc: { applicationsCount: 1 } },
  );

  // Completed collab on the protein campaign (counters bumped).
  await Application.create({
    campaignId: protein._id,
    creatorId: creators[4].profile._id,
    businessId: fitFuel.profile._id,
    pitch: 'Fitness creator, honest reviews.',
    status: 'Completed',
    submissionLink: 'https://youtube.com/watch?v=example',
    submissionProof: 'https://res.cloudinary.com/demo/image/upload/proof2.jpg',
    submittedAt: new Date(),
    verifiedAt: new Date(),
    verifiedBy: fitFuel.user._id,
  });
  await Campaign.updateOne(
    { _id: protein._id },
    { $set: { spotsRemaining: protein.spotsTotal - 1 }, $inc: { applicationsCount: 1 } },
  );
  await Promise.all([
    CreatorProfile.updateOne(
      { _id: creators[4].profile._id },
      { $inc: { totalCollabsCompleted: 1, totalRewardsEarned: 2800 } },
    ),
    BusinessProfile.updateOne({ _id: fitFuel.profile._id }, { $inc: { totalCollabsCompleted: 1 } }),
  ]);

  // --- Reports ---------------------------------------------------------------
  await Report.create({
    reporterId: businesses[0].user._id,
    targetType: 'creator',
    targetId: creators[1].profile._id,
    reason: 'Creator did not post the agreed content after accepting.',
  });
  await Report.create({
    reporterId: creators[0].user._id,
    targetType: 'business',
    targetId: glowBar.profile._id,
    reason: 'Reward differed from what the campaign described.',
  });

  // --- Summary ---------------------------------------------------------------
  const counts = {
    users: await User.countDocuments({}),
    businesses: await BusinessProfile.countDocuments({}),
    creators: await CreatorProfile.countDocuments({}),
    campaigns: await Campaign.countDocuments({}),
    applications: await Application.countDocuments({}),
    reports: await Report.countDocuments({}),
  };

  info('\n  ✓ seeded:');
  info(`     users=${counts.users} businesses=${counts.businesses} creators=${counts.creators}`);
  info(
    `     campaigns=${counts.campaigns} applications=${counts.applications} reports=${counts.reports}`,
  );
  info('\n  Logins (password for all): ' + SEED_PASSWORD);
  info(`     admin    → ${admin.email}`);
  info('     business → business1@collably.app … business3@collably.app');
  info('     creator  → creator1@collably.app … creator5@collably.app');

  await disconnectDB();
  info('\nDone.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[seed] FAILED:', err instanceof Error ? err.message : err);
    void disconnectDB().finally(() => process.exit(1));
  });
