import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import { USER_ROLES, type UserRole } from '../../../shared/constants/statuses';

/** A single chat message inside a Conversation. Carries text, an image, or both. */
export interface MessageDoc extends Document<Types.ObjectId> {
  conversationId: Types.ObjectId;
  senderUserId: Types.ObjectId;
  senderRole: UserRole;
  body: string;
  /** Hosted (Cloudinary) image URL for an image message. Optional. */
  imageUrl?: string;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageDoc>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: [...USER_ROLES], required: true },
    // Text is optional when the message carries an image; route validation ensures
    // at least one of body/imageUrl is present. Defaults to '' so it's never null.
    body: { type: String, default: '', trim: true, maxlength: 4000 },
    imageUrl: { type: String, trim: true },
    deliveredAt: { type: Date },
    readAt: { type: Date },
  },
  { timestamps: true },
);

// Cursor history: newest-first within a conversation.
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message: Model<MessageDoc> =
  (models.Message as Model<MessageDoc>) || model<MessageDoc>('Message', messageSchema);
