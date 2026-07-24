import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/**
 * One user blocking another (App Store Guideline 1.2 / Play UGC policy: an app
 * carrying user-generated content must let people both report content *and*
 * block abusive users).
 *
 * Directional by design: A blocking B is a separate row from B blocking A, so
 * unblocking is always the blocker's own decision to reverse. Enforcement reads
 * the pair in *either* direction though — see `areBlocked` — because a block has
 * to cut contact both ways or it is trivially defeated by the blocked party.
 *
 * Both ids are **User** ids (not role-profile ids): blocking is an account-level
 * action taken from chat or a profile screen, where only the User is in hand.
 */
export interface BlockDoc extends Document<Types.ObjectId> {
  blockerId: Types.ObjectId;
  blockedId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const blockSchema = new Schema<BlockDoc>(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

// One row per (blocker, blocked): makes blocking idempotent and lets a repeat
// block fail fast at the DB rather than silently duplicating.
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

// The "Blocked accounts" settings list reads newest-first for one blocker.
blockSchema.index({ blockerId: 1, createdAt: -1 });

export const Block: Model<BlockDoc> =
  (models.Block as Model<BlockDoc>) || model<BlockDoc>('Block', blockSchema);

/**
 * True when either user has blocked the other. Enforcement is symmetric on
 * purpose: if only the blocker were cut off, the blocked party could still open
 * the thread and keep messaging, which is exactly the harassment the block is
 * meant to stop.
 */
export async function areBlocked(
  a: Types.ObjectId,
  b: Types.ObjectId,
): Promise<boolean> {
  const hit = await Block.exists({
    $or: [
      { blockerId: a, blockedId: b },
      { blockerId: b, blockedId: a },
    ],
  });
  return Boolean(hit);
}

/**
 * The set of user ids the caller has blocked *or* been blocked by, as strings.
 * Used to filter people out of discovery and conversation lists in one round
 * trip rather than an N+1 check per row.
 */
export async function blockedUserIds(userId: Types.ObjectId): Promise<string[]> {
  const rows = await Block.find({
    $or: [{ blockerId: userId }, { blockedId: userId }],
  })
    .select('blockerId blockedId')
    .lean();

  const ids = new Set<string>();
  for (const row of rows) {
    const other = String(row.blockerId) === String(userId) ? row.blockedId : row.blockerId;
    ids.add(String(other));
  }
  return [...ids];
}
