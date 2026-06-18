import type { ID, ISODateString } from './common';

/**
 * Known notification types (PRD §5.6, §9.2). The stored `type` is a string;
 * these literals give autocomplete while `(string & {})` keeps it open to
 * future types without a breaking change.
 */
export const NOTIFICATION_TYPES = [
  'account_created',
  'password_reset',
  'new_application',
  'application_accepted',
  'application_rejected',
  'submission_received',
  'submission_verified',
  'revision_requested',
  'campaign_expiring',
  'new_message',
] as const;

export type KnownNotificationType = (typeof NOTIFICATION_TYPES)[number];
/** Known types keep autocomplete; `string & {}` keeps the union open-ended. */
export type NotificationType = KnownNotificationType | (string & {});

/** In-app + push notification record (PRD §5.6, §9.3). */
export interface Notification {
  _id: ID;
  userId: ID;
  type: NotificationType;
  message: string;
  /** In-app navigation target for a tap, e.g. "/campaign/123" (PRD §8.2). */
  deepLinkPath: string;
  isRead: boolean;
  createdAt: ISODateString;
}
