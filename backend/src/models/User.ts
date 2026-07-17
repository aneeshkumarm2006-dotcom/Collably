import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import { USER_ROLES, type UserRole } from '../../../shared/constants/statuses';

/**
 * User account (PRD §5.1). One User backs exactly one role profile
 * (Business or Creator). `passwordHash` is `select: false` so it never leaves
 * the database unless a query explicitly asks for it (e.g. login).
 */
export interface UserDoc extends Document<Types.ObjectId> {
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  avatar?: string | null;
  isVerified: boolean;
  isOnboarded: boolean;
  /** E.164 phone number, set once verified via SMS OTP (e.g. "+14165550199"). */
  phone?: string | null;
  /** True once the phone number has been confirmed by an SMS code. */
  isPhoneVerified: boolean;
  /** Expo push token, registered on app open after login (PRD §5.1, §9.1). */
  pushToken?: string | null;
  /** Admin moderation flag (PRD §7.5, §14). Banned users can't authenticate. */
  isBanned: boolean;
  /** Per-channel notification opt-outs (PRD §9.2); honoured by the notify service. */
  notificationPrefs?: { push: boolean; email: boolean };
  /** Google account subject id, set when the user signs in with Google (PRD §7.1). */
  googleId?: string | null;
  /** Apple subject id, set when the user signs in with Apple (App Store Guideline 4.8). */
  appleId?: string | null;
  /** SHA-256 hash of the active password-reset token (raw token is emailed, never stored). */
  passwordResetToken?: string | null;
  /** Expiry of the password-reset token; both are cleared once the password is reset. */
  passwordResetExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Never serialized to clients by default — opt in with `.select('+passwordHash')`.
    passwordHash: { type: String, select: false },
    role: { type: String, enum: [...USER_ROLES], required: true },
    avatar: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    isOnboarded: { type: Boolean, default: false },
    phone: { type: String, default: null },
    isPhoneVerified: { type: Boolean, default: false },
    pushToken: { type: String, default: null },
    isBanned: { type: Boolean, default: false },
    notificationPrefs: {
      type: { push: Boolean, email: Boolean },
      default: () => ({ push: true, email: true }),
      _id: false,
    },
    // Uniqueness is enforced by a partial index below (not here), so the many
    // users without a Google link — all stored as `null` — don't collide.
    googleId: { type: String, default: null },
    // Same partial-index rationale as googleId (see the index below).
    appleId: { type: String, default: null },
    // Reset-token fields are server-side only and never serialized to clients.
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

// Unique only among users who actually linked a Google account. A *partial* index
// (not `sparse`) is required: `default: null` stores an explicit null for every
// non-Google user, and a sparse unique index would still treat those nulls as
// colliding. The partial filter indexes a row only once `googleId` is a string.
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } },
);

// Same reasoning as googleId above — partial (not sparse) so the many explicit
// nulls from non-Apple users don't collide on the unique index.
userSchema.index(
  { appleId: 1 },
  { unique: true, partialFilterExpression: { appleId: { $type: 'string' } } },
);

// Reuse the model across hot reloads (ts-node-dev) to avoid OverwriteModelError.
export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>('User', userSchema);
