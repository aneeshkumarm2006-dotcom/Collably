import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import { USER_ROLES, type UserRole } from '../../../shared/constants/statuses';

/** A single chat message inside a Conversation (text-only for now). */
export interface MessageDoc extends Document<Types.ObjectId> {
  conversationId: Types.ObjectId;
  senderUserId: Types.ObjectId;
  senderRole: UserRole;
  body: string;
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
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    deliveredAt: { type: Date },
    readAt: { type: Date },
  },
  { timestamps: true },
);

// Cursor history: newest-first within a conversation.
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message: Model<MessageDoc> =
  (models.Message as Model<MessageDoc>) || model<MessageDoc>('Message', messageSchema);
