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
  applicationId: ID; // ref: Application (unique — 1:1 with the accepted collab)
  campaignId: ID; // ref: Campaign
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
}
