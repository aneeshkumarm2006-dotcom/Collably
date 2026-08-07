/**
 * One-shot migration: collapse per-collab chat threads into ONE thread per
 * business↔creator pair.
 *
 * Why: conversations used to be keyed by `applicationId`, so a creator accepted for
 * two campaigns from the same business ended up with two identical-looking rows in
 * their chat list. The schema now keys a thread on the user pair. This script makes
 * existing data match: for each pair it keeps the OLDEST thread (so history reads in
 * order), re-points every message from the duplicates onto it, sums the unread
 * counters, refreshes the last-message preview and the latest-collab context, then
 * deletes the emptied duplicates.
 *
 * It also reconciles indexes, replacing the old unique `applicationId_1` with the new
 * unique pair index. Admin/support threads are left completely alone.
 *
 * DRY RUN BY DEFAULT — it reports what it would do and changes nothing. Pass
 * `--apply` to actually write.
 *
 *   MONGODB_URI=... npx tsx src/scripts/migrateMergeConversations.ts
 *   MONGODB_URI=... npx tsx src/scripts/migrateMergeConversations.ts --apply
 *
 * Safe to run more than once; a second run finds nothing to merge.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';

const APPLY = process.argv.includes('--apply');

function log(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(...args);
}

/**
 * Did the connection string come from the shell, or did `dotenv/config` quietly
 * fall back to `backend/.env` (the DEV database)?
 *
 * This is the single easiest way to run a migration against the wrong database and
 * believe it succeeded: dev and prod are both named "collably", so the name proves
 * nothing, and a `MONGODB_URI=... npx tsx …` prefix that doesn't reach the process
 * fails silently. Comparing against the raw file contents makes the fallback loud.
 */
function uriSource(active: string): string {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    const raw = readFileSync(envPath, 'utf8');
    const line = raw.split('\n').find((l) => l.trim().startsWith('MONGODB_URI='));
    const fromFile = line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
    if (fromFile && fromFile === active) {
      return 'backend/.env  <-- NO URI WAS PASSED; this is your DEV database';
    }
    return 'the shell environment (overriding backend/.env)';
  } catch {
    return 'unknown (could not read backend/.env)';
  }
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const source = uriSource(uri);
  await mongoose.connect(uri);

  // ── Which database am I actually pointed at? ──────────────────────────────
  // Both dev and prod are named "collably", so the database name alone proves
  // nothing. `dotenv/config` (imported at the top) loads backend/.env, which is the
  // DEV connection string — and it's easy to run this thinking a prod URI was
  // passed when it wasn't. The row counts are the honest fingerprint: print them
  // and let the operator confirm before anything is written.
  const db = mongoose.connection.db;
  const [users, creators, convos] = await Promise.all([
    db?.collection('users').countDocuments({}) ?? 0,
    db?.collection('creatorprofiles').countDocuments({}) ?? 0,
    db?.collection('conversations').countDocuments({}) ?? 0,
  ]);
  log('─'.repeat(64));
  log('  TARGET DATABASE');
  log(`    uri from : ${source}`);
  log(`    name     : ${db?.databaseName}`);
  log(`    host     : ${mongoose.connection.host}`);
  log(`    users    : ${users}`);
  log(`    creators : ${creators}`);
  log(`    threads  : ${convos}`);
  log('─'.repeat(64));
  log('  Check these counts match the environment you meant to migrate.');
  log(APPLY ? '\n*** APPLY MODE — writes are real ***\n' : '\n--- DRY RUN (pass --apply to write) ---\n');

  // ── 1. Back-fill `kind` on legacy rows ────────────────────────────────────
  // The new unique index is partial on `kind: 'application'`. Rows created before
  // the field existed have no `kind` at all and would sit outside the index, so
  // they'd never be deduped and could still fork later.
  const missingKind = await Conversation.countDocuments({ kind: { $exists: false } });
  if (missingKind > 0) {
    log(`Back-filling kind:'application' on ${missingKind} legacy thread(s).`);
    if (APPLY) {
      await Conversation.updateMany({ kind: { $exists: false } }, { $set: { kind: 'application' } });
    }
  } else {
    log('No legacy threads missing `kind`.');
  }

  // ── 2. Drop the legacy unique index BEFORE merging ────────────────────────
  // Order matters. The merge re-points the keeper at the newest collab's
  // `applicationId` while the duplicate that currently holds that id still exists,
  // so with a unique `applicationId_1` still in place that write collides (E11000)
  // and the migration dies half-done. Uniqueness on `applicationId` is exactly what
  // this migration exists to retire, so retire it first.
  const coll = Conversation.collection;
  const legacyUnique = (await coll.indexes()).find((ix) => ix.name === 'applicationId_1' && ix.unique);
  if (legacyUnique) {
    log("Dropping legacy UNIQUE applicationId_1 (a thread can hold many collabs now).");
    if (APPLY) {
      await coll.dropIndex('applicationId_1');
      log('  dropped.');
    }
  } else {
    log('No legacy unique applicationId_1 index (nothing to drop).');
  }

  // ── 3. Group application threads by participant pair ──────────────────────
  const threads = await Conversation.find({ kind: { $ne: 'admin' } }).sort({ createdAt: 1 });
  const groups = new Map<string, typeof threads>();
  for (const t of threads) {
    // Guard: a thread missing either seat can't be paired — leave it untouched.
    if (!t.businessUserId || !t.creatorUserId) continue;
    const key = `${String(t.businessUserId)}::${String(t.creatorUserId)}`;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const dupeGroups = [...groups.entries()].filter(([, list]) => list.length > 1);
  log(`\n${threads.length} application thread(s) across ${groups.size} pair(s).`);
  log(`${dupeGroups.length} pair(s) have duplicates to merge.\n`);

  let messagesMoved = 0;
  let threadsRemoved = 0;

  for (const [key, list] of dupeGroups) {
    // Oldest wins: keeping it preserves the natural start of the relationship.
    const [keeper, ...dupes] = list;
    const dupeIds = dupes.map((d) => d._id);

    const moving = await Message.countDocuments({ conversationId: { $in: dupeIds } });
    const unreadB = list.reduce((n, c) => n + (c.unreadByBusiness ?? 0), 0);
    const unreadC = list.reduce((n, c) => n + (c.unreadByCreator ?? 0), 0);

    // Latest-collab context comes from whichever thread was most recently active.
    const newest = list.reduce((a, b) =>
      (b.lastMessageAt?.getTime() ?? b.createdAt.getTime()) >
      (a.lastMessageAt?.getTime() ?? a.createdAt.getTime())
        ? b
        : a,
    );

    log(`pair ${key}`);
    log(`  keep ${String(keeper._id)} (created ${keeper.createdAt.toISOString().slice(0, 10)})`);
    log(`  merge ${dupes.length} duplicate(s), moving ${moving} message(s)`);
    log(`  unread → business ${unreadB}, creator ${unreadC}; context → "${newest.campaignTitle ?? '(none)'}"`);

    if (APPLY) {
      await Message.updateMany({ conversationId: { $in: dupeIds } }, { $set: { conversationId: keeper._id } });

      // Recompute the preview from the merged message set rather than trusting
      // whichever thread happened to be newest — the two can disagree.
      const last = await Message.findOne({ conversationId: keeper._id }).sort({ createdAt: -1 });

      // A raw `updateOne`, NOT `doc.save()`. `save()` runs full schema validation,
      // so a single legacy row missing a now-required field (an old thread with no
      // `businessId`, say) would abort the whole migration part-way through, leaving
      // messages re-pointed but threads un-merged. A migration must be able to carry
      // imperfect historical data across; validation belongs on new writes.
      const set: Record<string, unknown> = {
        unreadByBusiness: unreadB,
        unreadByCreator: unreadC,
        applicationId: newest.applicationId,
        campaignId: newest.campaignId,
        campaignTitle: newest.campaignTitle,
        businessId: newest.businessId,
        creatorId: newest.creatorId,
      };
      if (last) {
        set.lastMessage = last.body?.trim() ? last.body : last.imageUrl ? 'Photo' : '';
        set.lastMessageAt = last.createdAt;
        set.lastSenderUserId = last.senderUserId;
      }
      // Drop keys that are genuinely absent rather than writing explicit undefined.
      for (const k of Object.keys(set)) if (set[k] === undefined) delete set[k];

      await Conversation.collection.updateOne({ _id: keeper._id }, { $set: set });
      await Conversation.deleteMany({ _id: { $in: dupeIds } });
    }

    messagesMoved += moving;
    threadsRemoved += dupes.length;
  }

  // ── 4. Rebuild indexes from the schema ────────────────────────────────────
  log(`\nIndexes now: ${(await coll.indexes()).map((ix) => ix.name).join(', ')}`);
  if (APPLY) {
    log('Syncing indexes from the schema...');
    await Conversation.syncIndexes();
    log(`Final indexes: ${(await coll.indexes()).map((ix) => ix.name).join(', ')}`);
  }

  log(
    `\n${APPLY ? 'Merged' : 'Would merge'}: ${threadsRemoved} duplicate thread(s) removed, ${messagesMoved} message(s) re-pointed.`,
  );
  if (!APPLY) log('Nothing was written. Re-run with --apply.');

  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
