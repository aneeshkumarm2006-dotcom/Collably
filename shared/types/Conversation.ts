import type { ID, ISODateString, Timestamped } from './common';
import type { UserSummary } from './User';

/**
 * A 1:1 chat thread between a business and a creator. One conversation is opened
 * per **accepted** application (the connection the collab represents), created
 * when the business approves the creator. Both participants can message until the
 * collab is done — the thread isn't deleted when a campaign closes/completes.
 */
export interface Conversation extends Timestamped {
  _id: ID;
  /**
   * Thread flavour. `application` is the business<->creator collab chat; `admin`
   * is the Local Creator Crew support thread with a creator. Absent is treated as
   * `application` for back-compat with rows created before this field existed.
   */
  kind?: 'application' | 'admin';
  applicationId?: ID; // ref: Application (unique per accepted collab; absent on admin threads)
  campaignId?: ID; // ref: Campaign (absent on admin threads)
  /** Denormalised for list rows so we don't populate the campaign every time. */
  campaignTitle?: string;
  businessUserId: ID; // ref: User
  creatorUserId: ID; // ref: User
  /**
   * The *other* participant relative to the calling user, attached by the API so
   * the client can render the row (name/avatar/role) without a second request.
   */
  otherParticipant?: UserSummary;
  lastMessage?: string;
  lastMessageAt?: ISODateString;
  lastSenderUserId?: ID;
  /** Unread messages for the calling user (0 for the other participant's view). */
  unreadCount: number;
  /**
   * True when the OTHER participant has read the viewer's last message (their unread
   * counter is 0). Powers the list read-receipt tick: grey double-tick (delivered)
   * until this flips true, then blue (read). Only meaningful when the viewer sent last.
   */
  lastReadByOther?: boolean;
  /**
   * True when the viewer's last message has reached the recipient's device
   * (`deliveredAt`/`readAt` is set on that message). Lets the list row mirror the
   * thread bubble: single tick when only sent, grey double-tick once delivered.
   * Only meaningful when the viewer sent last.
   */
  lastMessageDelivered?: boolean;
}
