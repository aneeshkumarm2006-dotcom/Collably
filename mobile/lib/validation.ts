/**
 * Lightweight client-side validators for the auth forms (PRD §7.1). These mirror
 * the backend's zod rules (`routes/auth.ts`) so the user gets instant feedback,
 * but the server stays the source of truth — a passing client check never skips
 * the API's own validation.
 */

/** Minimum password length — matches backend `MIN_PASSWORD_LENGTH`. */
export const MIN_PASSWORD_LENGTH = 8;

// Pragmatic email shape check (not RFC-exhaustive — the server does the strict pass).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message for an invalid email, or null when valid. */
export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Email is required';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address';
  return null;
}

/** Returns an error message for an invalid password, or null when valid. */
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

/** Returns an error message for an empty/blank name, or null when valid. */
export function validateName(name: string): string | null {
  if (!name.trim()) return 'Name is required';
  return null;
}
