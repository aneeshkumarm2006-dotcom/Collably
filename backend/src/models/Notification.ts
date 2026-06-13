import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import { type NotificationType } from '../../../shared/types/Notification';

/**
 * In-app + push notification record (PRD §5.6, §9.3). `type` is stored as a
 * free string (validated against `NOTIFICATION_TYPES` at the route layer) so new
 * notification kinds don't require a schema migration. `deepLinkPath` is the
 * in-app navigation target a tap routes to (PRD §8.2).
 */
export interface NotificationDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  type: NotificationType;
  message: string;
  deepLinkPath: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    deepLinkPath: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Fetch a user's notifications newest-first, with unread filtering (PRD §9.3).
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<NotificationDoc> =
  (models.Notification as Model<NotificationDoc>) ||
  model<NotificationDoc>('Notification', notificationSchema);
