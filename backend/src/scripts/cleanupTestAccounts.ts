/**
 * One-off: remove throwaway accounts created while testing email delivery.
 * Targets ONLY the known test patterns — never touches real users.
 *   npx ts-node src/scripts/cleanupTestAccounts.ts        (dry run, lists matches)
 *   npx ts-node src/scripts/cleanupTestAccounts.ts --yes  (actually deletes)
 */
import mongoose from 'mongoose';
import { env } from '../lib/env';
import { User } from '../models/User';

const PATTERNS = [
  /@example\.com$/i,
  /^otptest.*@/i,
  /^probe\./i,
  /^prem\+resend/i,
  /^prem\+verify/i,
  /^info\+prodtest@/i,
];

async function main(): Promise<void> {
  const apply = process.argv.includes('--yes');
  await mongoose.connect(env.mongodbUri);
  const users = await User.find({}).select('email name createdAt').lean();
  const matches = users.filter((u) => PATTERNS.some((p) => p.test(u.email)));

  console.log(`Found ${matches.length} test account(s):`);
  for (const m of matches) console.log(`  - ${m.email}  (${m.name})`);

  if (!matches.length) { await mongoose.disconnect(); return; }
  if (!apply) {
    console.log('\nDry run. Re-run with --yes to delete these.');
    await mongoose.disconnect();
    return;
  }
  const ids = matches.map((m) => m._id);
  const res = await User.deleteMany({ _id: { $in: ids } });
  console.log(`\nDeleted ${res.deletedCount} account(s).`);
  await mongoose.disconnect();
}
void main();
