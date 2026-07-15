import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/**
 * An in-progress Instagram ownership check via the DM-code flow.
 *
 * The lifecycle, driven partly by an inbound Meta webhook:
 *   awaiting_dm → the creator claimed a handle; we're waiting for them to DM "hi"
 *                 to our business account (that DM is what unlocks Meta's profile read).
 *   code_sent   → their DM arrived, its sender username matched the claimed handle
 *                 (proving ownership), and we DM'd back a 6-digit code.
 *   verified    → they entered the code; `followerCount` is Meta's real number.
 *
 * Only the code **hash** is stored. Codes are attempt-capped and the row self-expires
 * via a TTL index. One live session per creator at a time (enforced in the route by
 * clearing prior sessions on start).
 */
export type InstagramVerificationStatus = 'awaiting_dm' | 'code_sent' | 'verified';

export interface InstagramVerificationDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  /** Normalised (lowercase, no @) handle the creator claims to own. */
  claimedHandle: string;
  status: InstagramVerificationStatus;
  /** Instagram-scoped sender id from the webhook, set once their DM arrives. */
  igsid?: string | null;
  /** The sender's actual username from Meta — must equal `claimedHandle` to proceed. */
  igUsername?: string | null;
  /** Meta's follower count for the account (authoritative, not self-reported). */
  followerCount?: number | null;
  /** HMAC of the DM'd code (see lib/otp); the digits are never stored. */
  codeHash?: string | null;
  attempts: number;
  expiresAt: Date;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const instagramVerificationSchema = new Schema<InstagramVerificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    claimedHandle: { type: String, required: true, lowercase: true, trim: true, index: true },
    status: { type: String, enum: ['awaiting_dm', 'code_sent', 'verified'], default: 'awaiting_dm' },
    igsid: { type: String, default: null },
    igUsername: { type: String, default: null },
    followerCount: { type: Number, default: null, min: 0 },
    codeHash: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The webhook finds a pending session by the sender's username.
instagramVerificationSchema.index({ claimedHandle: 1, status: 1 });
// Poll lookup: the newest session for a creator.
instagramVerificationSchema.index({ userId: 1, createdAt: -1 });
// Self-clean abandoned sessions.
instagramVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const InstagramVerification: Model<InstagramVerificationDoc> =
  (models.InstagramVerification as Model<InstagramVerificationDoc>) ||
  model<InstagramVerificationDoc>('InstagramVerification', instagramVerificationSchema);
