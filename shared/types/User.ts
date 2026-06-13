import type { ID, ISODateString, Timestamped } from './common';
import type { UserRole } from '../constants/statuses';

/** Per-channel notification opt-outs (PRD §9.2). The in-app feed is always on. */
export interface NotificationPrefs {
  push: boolean;
  email: boolean;
}

/** Core account record (PRD §5.1). One User backs exactly one role profile. */
export interface User extends Timestamped {
  _id: ID;
  name: string;
  email: string;
  /** Bcrypt hash — server-side only, never serialized to clients. */
  passwordHash?: string;
  role: UserRole;
  avatar?: string | null;
  isVerified: boolean;
  isOnboarded: boolean;
  /** Expo push token, registered on app open after login (PRD §5.1, §8.2). */
  pushToken?: string | null;
  /** Admin moderation flag (PRD §7.5, §14). Banned users can't authenticate. */
  isBanned: boolean;
  /** Push/email channel preferences set from the Settings screen (PRD §7.3, §9.2). */
  notificationPrefs?: NotificationPrefs;
}

/** Shape safe to send to clients (no secrets). */
export type PublicUser = Omit<User, 'passwordHash'>;

/** Minimal user reference for embedding in lists/cards. */
export interface UserSummary {
  _id: ID;
  name: string;
  avatar?: string | null;
  role: UserRole;
  createdAt: ISODateString;
}
