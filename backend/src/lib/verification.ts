/**
 * Issue and confirm one-time verification codes, shared by the email and phone
 * flows (and, later, Instagram). The route layer owns *delivery* (send the email /
 * SMS) and *effect* (flip isVerified / isPhoneVerified); everything about the code
 * itself — cooldown, single-use, attempt cap, expiry — lives here so both channels
 * behave identically.
 */
import type { Types } from 'mongoose';
import { VerificationCode, type VerificationChannel } from '../models/VerificationCode';
import { generateOtp, hashOtp, verifyOtp } from './otp';
import { AppError } from '../middleware/errorHandler';
import { env } from './env';

/**
 * Create a fresh code for `(user, channel, target)` and return the plaintext once
 * so the caller can deliver it. Enforces a resend cooldown and invalidates any
 * earlier code, so only the newest code is ever valid.
 *
 * Throws 429 if a code was requested too recently.
 */
export async function issueVerificationCode(
  userId: Types.ObjectId,
  channel: VerificationChannel,
  target: string,
): Promise<string> {
  // Cooldown: refuse if the most recent code is younger than the window.
  const recent = await VerificationCode.findOne({ userId, channel }).sort({ createdAt: -1 });
  if (recent) {
    const ageSeconds = (Date.now() - recent.createdAt.getTime()) / 1000;
    const remaining = Math.ceil(env.otpResendCooldownSeconds - ageSeconds);
    if (remaining > 0) {
      throw new AppError(429, `Please wait ${remaining}s before requesting another code`);
    }
  }

  // Only the newest code should work — burn any older live ones for this channel.
  await VerificationCode.deleteMany({ userId, channel, consumedAt: null });

  const code = generateOtp();
  await VerificationCode.create({
    userId,
    channel,
    target,
    codeHash: hashOtp(code),
    expiresAt: new Date(Date.now() + env.otpTtlMinutes * 60_000),
  });

  return code;
}

/**
 * Check a submitted code for `(user, channel, target)`. Returns on success;
 * throws 400 on a wrong/expired code (incrementing the attempt counter and
 * burning the code once the cap is hit).
 */
export async function confirmVerificationCode(
  userId: Types.ObjectId,
  channel: VerificationChannel,
  target: string,
  submitted: string,
): Promise<void> {
  const record = await VerificationCode.findOne({
    userId,
    channel,
    target,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record) {
    throw new AppError(400, 'This code has expired — request a new one');
  }

  if (record.attempts >= env.otpMaxAttempts) {
    // Burn it so the caller can't keep guessing; they must request a new code.
    await record.deleteOne();
    throw new AppError(400, 'Too many incorrect attempts — request a new code');
  }

  if (!verifyOtp(submitted, record.codeHash)) {
    record.attempts += 1;
    await record.save();
    const left = env.otpMaxAttempts - record.attempts;
    const plural = left === 1 ? 'attempt' : 'attempts';
    throw new AppError(400, left > 0 ? `Incorrect code — ${left} ${plural} left` : 'Incorrect code');
  }

  record.consumedAt = new Date();
  await record.save();
}
