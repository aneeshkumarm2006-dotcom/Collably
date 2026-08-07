import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/**
 * A 1:1 chat thread between a business and a creator, opened when the business
 * approves the creator's application (one conversation per accepted collab). The
 * `applicationId` is unique, so re-approving / re-creating is idempotent.
 *
 * `participantUserIds` mirrors `[businessUserId, creatorUserId]` and is indexed so
 * "my conversations" is a single `$in`-free membership query. Unread counts are
 * tracked per participant role and reset when that user opens the thread.
 */
export interface ConversationDoc extends Document<Types.ObjectId> {
  /**
   * Thread flavour. `application` is the business<->creator collab chat (the
   * default, keyed by a unique applicationId). `admin` is the support thread
   * between the Local Creator Crew support account and a single *member* — a
   * creator OR a business (the same plumbing serves both).
   */
  kind: 'application' | 'admin';
  applicationId?: Types.ObjectId;
  campaignId?: Types.ObjectId;
  /** Denormalised so list rows don't populate the campaign each time. */
  campaignTitle?: string;
  businessId?: Types.ObjectId; // BusinessProfile
  creatorId?: Types.ObjectId; // CreatorProfile
  businessUserId?: Types.ObjectId; // User (for admin threads: the support user)
  /**
   * User (for admin threads this is the non-support MEMBER — a creator or a
   * business owner — occupying the "member" seat so the dyad plumbing, unread
   * columns and serializer resolve support as the counterpart without
   * special-casing per role).
   */
  creatorUserId: Types.ObjectId; // User
  participantUserIds: Types.ObjectId[];
  lastMessage?: string;
  lastMessageAt?: Date;
  lastSenderUserId?: Types.ObjectId;
  /** For admin threads this doubles as the support/admin-side unread counter. */
  unreadByBusiness: number;
  unreadByCreator: number;
  createdAt: Date;
  updatedAt: Date;
}

// Collab-thread fields are required only for `application` conversations; an
// `admin` support thread has no application/campaign/business behind it.
const requiredForApplication = function (this: ConversationDoc): boolean {
  return this.kind !== 'admin';
};

const conversationSchema = new Schema<ConversationDoc>(
  {
    kind: { type: String, enum: ['application', 'admin'], default: 'application' },
    // Uniqueness is enforced by the partial index below (not here) so multiple
    // admin threads — all without an applicationId — don't collide on a unique key.
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: requiredForApplication,
    },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: requiredForApplication },
    campaignTitle: { type: String, trim: true },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: requiredForApplication,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'CreatorProfile',
      required: requiredForApplication,
    },
    businessUserId: { type: Schema.Types.ObjectId, ref: 'User', required: requiredForApplication },
    creatorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participantUserIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    lastMessage: { type: String, trim: true },
    lastMessageAt: { type: Date },
    lastSenderUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    unreadByBusiness: { type: Number, default: 0, min: 0 },
    unreadByCreator: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// ONE thread per business↔creator pair, not one per collab.
//
// This used to be a unique index on `applicationId`, which meant a creator accepted
// for two campaigns from the same business got two identical-looking rows in their
// chat list. People expect a conversation to be with a *person*, not with a contract,
// so the identity of a thread is now the pair of users. The collab fields below
// (`applicationId`, `campaignId`, `campaignTitle`) still exist, but they now describe
// the MOST RECENT collab in the thread and are re-`$set` each time a new application
// is accepted — that's what keeps the "Collab · <title>" strip meaningful.
//
// Partial on `kind: 'application'` so admin/support threads (which have their own
// index below) don't participate. The migration back-fills `kind` on legacy rows that
// predate the field, otherwise they'd fall outside this filter and stay un-deduped.
conversationSchema.index(
  { businessUserId: 1, creatorUserId: 1 },
  { unique: true, partialFilterExpression: { kind: 'application' } },
);

// Not unique any more — `applicationId` is now "the latest collab", so it's only a
// lookup path (e.g. a notification deep-link resolving its thread).
conversationSchema.index({ applicationId: 1 });

// One admin/support thread per member — idempotent get-or-create relies on this.
// `creatorUserId` holds the non-support member (a creator OR a business owner);
// user ids never collide across roles, so this single key uniquely identifies the
// one admin thread for that member. No parallel business index or migration needed.
conversationSchema.index(
  { kind: 1, creatorUserId: 1 },
  { unique: true, partialFilterExpression: { kind: 'admin' } },
);

// "My conversations", newest activity first.
conversationSchema.index({ participantUserIds: 1, lastMessageAt: -1 });

export const Conversation: Model<ConversationDoc> =
  (models.Conversation as Model<ConversationDoc>) ||
  model<ConversationDoc>('Conversation', conversationSchema);
