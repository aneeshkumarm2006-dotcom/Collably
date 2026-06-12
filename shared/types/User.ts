import type { ID, ISODateString, Timestamped } from './common';
import type { UserRole } from '../constants/statuses';

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
