/**
 * One-time code (OTP) primitives — generation, hashing, and constant-time check.
 *
 * The plaintext code is never persisted. We store an HMAC keyed with the server
 * secret, so a database read alone can't recover a live code, and we compare in
 * constant time so a timing side-channel can't leak digits. Brute force is held off
 * by the short code space *combined with* a per-code attempt cap and TTL (enforced
 * by the caller), not by the hash alone.
 */
import crypto from 'node:crypto';
import { env } from './env';

/** Digits in a code. Six is the familiar default and fits the 6-box input. */
const OTP_LENGTH = 6;

/** A cryptographically-random N-digit code, zero-padded (never a short "007"→"7"). */
export function generateOtp(length = OTP_LENGTH): string {
  const max = 10 ** length;
  // randomInt is uniform over [0, max) — no modulo bias.
  return String(crypto.randomInt(0, max)).padStart(length, '0');
}

/** HMAC-SHA256 of a code, keyed with the server secret. Deterministic for storage + lookup. */
export function hashOtp(code: string): string {
  return crypto.createHmac('sha256', env.jwtSecret).update(code).digest('hex');
}

/** Constant-time comparison of a submitted code against a stored hash. */
export function verifyOtp(code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtp(code), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  // timingSafeEqual throws on length mismatch; equal lengths here (both sha256).
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}
