import type { ID, ISODateString } from './common';
import type { UserRole } from '../constants/statuses';

/**
 * A single chat message inside a {@link Conversation}. Text-only for now; the
 * `senderRole` lets the UI align/label bubbles without an extra user lookup.
 */
export interface Message {
  _id: ID;
  conversationId: ID; // ref: Conversation
  senderUserId: ID; // ref: User
  senderRole: UserRole;
  body: string;
  /** Set once the message has reached the recipient's device (WhatsApp ✓✓ grey). */
  deliveredAt?: ISODateString;
  /** Set once the recipient has opened the thread (WhatsApp ✓✓ blue). */
  readAt?: ISODateString;
  createdAt: ISODateString;
}
