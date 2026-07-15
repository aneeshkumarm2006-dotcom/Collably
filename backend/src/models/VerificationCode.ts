import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/**
 * A one-time verification code (OTP) sent to a user's email or phone.
 *
 * Only the **hash** of the code is stored — never the digits — so a database leak
 * can't be replayed. Codes are single-use (`consumedAt`), attempt-capped
 * (`attempts`), and short-lived: a TTL index drops the row at `expiresAt`, so
 * expired codes clean themselves up.
 *
 * One model serves email and phone (and later Instagram) — `channel` says which,
 * and `target` records the exact address/number being proven so a code issued for
 * one email can't confirm a different one.
 */
export type VerificationChannel = 'email' | 'phone';

export interface VerificationCodeDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  channel: VerificationChannel;
  /** The exact email or phone this code proves ownership of. */
  target: string;
  /** HMAC of the plaintext code (see lib/otp) — the digits are never stored. */
  codeHash: string;
  /** Failed guesses so far; the code is burned once this hits the cap. */
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const verificationCodeSchema = new Schema<VerificationCodeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: ['email', 'phone'], required: true },
    target: { type: String, required: true, trim: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Find the newest live code for a user+channel (send cooldown, confirm lookup).
verificationCodeSchema.index({ userId: 1, channel: 1, createdAt: -1 });

// Mongo drops the document once `expiresAt` passes, so old codes never accumulate.
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationCode: Model<VerificationCodeDoc> =
  (models.VerificationCode as Model<VerificationCodeDoc>) ||
  model<VerificationCodeDoc>('VerificationCode', verificationCodeSchema);
