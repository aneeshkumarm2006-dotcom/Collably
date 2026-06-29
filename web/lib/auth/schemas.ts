/**
 * Client-side auth validation — zod schemas that mirror the backend's
 * `registerSchema` / `loginSchema` / `forgotPasswordSchema` / `resetPasswordSchema`
 * (`app/backend/src/routes/auth.ts`) so the forms catch the same mistakes before a
 * round-trip and surface inline field errors. The backend stays the source of
 * truth — these only avoid obviously-bad submissions.
 *
 * Framework-neutral (no `'use client'`) so server route handlers could reuse them
 * too; the form components import them directly.
 */
import { z } from 'zod';

/** Mirrors `MIN_PASSWORD_LENGTH` in `app/backend/src/lib/password.ts`. */
export const MIN_PASSWORD_LENGTH = 8;

const email = z.string().trim().min(1, 'Email is required').email('Enter a valid email');

/** New-password rule shared by register + reset (backend: 8–128 chars). */
const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(128, 'Password is too long');

export const loginSchema = z.object({
  email,
  // Backend only requires non-empty on login (don't leak the length rule here).
  password: z.string().min(1, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email,
  password: newPassword,
});
export type SignupValues = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * Flatten a `ZodError` into a `{ field: firstMessage }` map for inline display.
 * Keyed by the first path segment; keeps only the first error per field.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in out)) out[key] = issue.message;
  }
  return out;
}
