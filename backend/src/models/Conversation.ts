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
   * between the Local Creator Crew support account and a single creator.
   */
  kind: 'application' | 'admin';
  applicationId?: Types.ObjectId;
  campaignId?: Types.ObjectId;
  /** Denormalised so list rows don't populate the campaign each time. */
  campaignTitle?: string;
  businessId?: Types.ObjectId; // BusinessProfile
  creatorId?: Types.ObjectId; // CreatorProfile
  businessUserId?: Types.ObjectId; // User (for admin threads: the support user)
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

// Keep application threads 1:1 with their accepted collab, while allowing many
// admin threads (which carry no applicationId). Partial (not sparse) so only docs
// that actually have an ObjectId applicationId participate in the unique index.
conversationSchema.index(
  { applicationId: 1 },
  { unique: true, partialFilterExpression: { applicationId: { $type: 'objectId' } } },
);

// One admin/support thread per creator — idempotent get-or-create relies on this.
conversationSchema.index(
  { kind: 1, creatorUserId: 1 },
  { unique: true, partialFilterExpression: { kind: 'admin' } },
);

// "My conversations", newest activity first.
conversationSchema.index({ participantUserIds: 1, lastMessageAt: -1 });

export const Conversation: Model<ConversationDoc> =
  (models.Conversation as Model<ConversationDoc>) ||
  model<ConversationDoc>('Conversation', conversationSchema);
