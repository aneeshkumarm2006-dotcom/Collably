/**
 * Create (or reset) the App Store / Play Store **reviewer demo account**.
 *
 * Why this exists: sign-up is gated behind mandatory email + phone OTP. An Apple or
 * Google reviewer can't receive our SMS/email, so without a ready-made account they
 * physically cannot get into the app — an automatic rejection ("we couldn't sign
 * in", Guideline 2.1). This script mints an account that is already **email- and
 * phone-verified and fully onboarded**, so the reviewer logs in and lands straight
 * on the home screen.
 *
 * Put the printed credentials in App Store Connect → App Review Information, and in
 * the Play Console → App access.
 *
 *   npx ts-node --transpile-only src/scripts/seed-review-account.ts
 *
 * Safe to re-run: it upserts and re-verifies the same account.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User, CreatorProfile } from '../models';
import { hashPassword } from '../lib/password';

const EMAIL = 'appreview@localshout.app';
const PASSWORD = 'ReviewLocalShout!2026';
const NAME = 'App Review';
// A real-format Canadian number. It's never texted — the account is pre-verified.
const PHONE = '+14165550142';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);

  let user = await User.findOne({ email: EMAIL });
  if (!user) {
    user = new User({ email: EMAIL, role: 'creator' });
  }

  user.name = NAME;
  user.passwordHash = await hashPassword(PASSWORD);
  user.role = 'creator';
  // The whole point: skip every gate the reviewer can't clear.
  user.isVerified = true; // email
  user.phone = PHONE;
  user.isPhoneVerified = true; // phone
  user.isOnboarded = true; // no onboarding wall
  user.isBanned = false;
  await user.save();

  // A creator profile must exist (the app 404s without one) and be admin-approved,
  // so the reviewer can actually apply to a campaign and exercise the core flow.
  await CreatorProfile.findOneAndUpdate(
    { userId: user._id },
    {
      $setOnInsert: { userId: user._id },
      $set: {
        bio: 'Demo account for app review.',
        location: { city: 'Toronto', state: 'Ontario', country: 'Canada' },
        niche: [],
        contentTypes: [],
        portfolio: [],
        isVerified: true, // admin-approved → can apply
        isSuspended: false,
      },
    },
    { upsert: true, new: true },
  );

  console.log('\n✅ Reviewer demo account ready — paste these into App Store Connect:\n');
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}\n`);
  console.log('   (email + phone pre-verified, onboarded, admin-approved)\n');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
