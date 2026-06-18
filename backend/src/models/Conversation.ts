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
  applicationId: Types.ObjectId;
  campaignId: Types.ObjectId;
  /** Denormalised so list rows don't populate the campaign each time. */
  campaignTitle?: string;
  businessId: Types.ObjectId; // BusinessProfile
  creatorId: Types.ObjectId; // CreatorProfile
  businessUserId: Types.ObjectId; // User
  creatorUserId: Types.ObjectId; // User
  participantUserIds: Types.ObjectId[];
  lastMessage?: string;
  lastMessageAt?: Date;
  lastSenderUserId?: Types.ObjectId;
  unreadByBusiness: number;
  unreadByCreator: number;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationDoc>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
    },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    campaignTitle: { type: String, trim: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'BusinessProfile', required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'CreatorProfile', required: true },
    businessUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

// "My conversations", newest activity first.
conversationSchema.index({ participantUserIds: 1, lastMessageAt: -1 });

export const Conversation: Model<ConversationDoc> =
  (models.Conversation as Model<ConversationDoc>) ||
  model<ConversationDoc>('Conversation', conversationSchema);
