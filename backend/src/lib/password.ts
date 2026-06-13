/**
 * Password hashing helpers (PRD §5.7). Uses `bcryptjs` — a pure-JS, API-compatible
 * drop-in for `bcrypt` that needs no native toolchain (see backend/README.md).
 */
import bcrypt from 'bcryptjs';

/** Cost factor. 10 rounds is the bcrypt default — a good speed/security balance. */
const SALT_ROUNDS = 10;

/** Minimum acceptable password length, enforced again at the validation layer. */
export const MIN_PASSWORD_LENGTH = 8;

/** Hash a plaintext password for storage in `User.passwordHash`. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plaintext attempt against a stored hash. Returns `false` (never
 * throws) when the user has no password set — e.g. a Google-only account.
 */
export async function verifyPassword(plain: string, hash?: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}
