/**
 * One-shot migration: reconcile the Conversation collection's indexes after
 * admin support threads landed (PRD chat generalization).
 *
 * The old schema had a plain unique index on `applicationId` (`applicationId_1`).
 * Admin↔creator threads have NO applicationId, and a plain unique index treats
 * every missing value as `null` — so the SECOND admin thread would collide on
 * that legacy index. The new schema replaces it with a PARTIAL unique index that
 * only applies when `applicationId` is an ObjectId. Mongoose does not drop the
 * old index automatically, so this script drops it and rebuilds from the schema.
 *
 * Safe to run more than once. Run against the target DB:
 *   MONGODB_URI=... npx tsx src/scripts/migrateConversationIndexes.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  console.log('Connected. Reconciling Conversation indexes...');

  const coll = Conversation.collection;
  const existing = await coll.indexes();
  const legacy = existing.find(
    (ix) => ix.name === 'applicationId_1' && ix.unique && !ix.partialFilterExpression,
  );

  if (legacy) {
    console.log('Dropping legacy non-partial unique index applicationId_1...');
    await coll.dropIndex('applicationId_1');
    console.log('Dropped.');
  } else {
    console.log('No legacy applicationId_1 index found (nothing to drop).');
  }

  // Rebuild from the current schema (creates the partial unique indexes).
  console.log('Syncing indexes from schema...');
  await Conversation.syncIndexes();
  const now = await coll.indexes();
  console.log('Final indexes:', now.map((ix) => ix.name).join(', '));

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
