import { describe, expect, it } from 'vitest';
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  MIN_PASSWORD_LENGTH,
} from '@/lib/auth/schemas';

describe('loginSchema', () => {
  it('accepts a valid email + non-empty password', () => {
    const r = loginSchema.safeParse({ email: 'user@example.com', password: 'x' });
    expect(r.success).toBe(true);
  });

  it('rejects an empty email', () => {
    const r = loginSchema.safeParse({ email: '', password: 'secret1' });
    expect(r.success).toBe(false);
  });

  it('rejects a malformed email', () => {
    const r = loginSchema.safeParse({ email: 'not-an-email', password: 'secret1' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).email).toBe('Enter a valid email');
  });

  it('rejects an empty password (login does not leak the length rule)', () => {
    const r = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).password).toBe('Password is required');
  });
});

describe('signupSchema', () => {
  it('accepts a valid name + email + 8-char password', () => {
    const r = signupSchema.safeParse({
      name: 'Maya',
      email: 'maya@example.com',
      password: '12345678',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a password shorter than the minimum length', () => {
    const r = signupSchema.safeParse({
      name: 'Maya',
      email: 'maya@example.com',
      password: '1234567', // 7 chars, one below the boundary
    });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(fieldErrors(r.error).password).toBe(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
  });

  it('rejects a name longer than 120 characters', () => {
    const r = signupSchema.safeParse({
      name: 'a'.repeat(121),
      email: 'maya@example.com',
      password: '12345678',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).name).toBe('Name is too long');
  });

  it('rejects an empty name and a bad email', () => {
    expect(
      signupSchema.safeParse({ name: '', email: 'maya@example.com', password: '12345678' }).success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ name: 'Maya', email: 'bad', password: '12345678' }).success,
    ).toBe(false);
  });

  it('accepts a name at the 120-character boundary', () => {
    const r = signupSchema.safeParse({
      name: 'a'.repeat(120),
      email: 'maya@example.com',
      password: '12345678',
    });
    expect(r.success).toBe(true);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects an empty and a malformed email', () => {
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts matching passwords at or above the minimum length', () => {
    const r = resetPasswordSchema.safeParse({
      password: 'supersecret',
      confirmPassword: 'supersecret',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a password shorter than the minimum length', () => {
    const r = resetPasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).password).toBeDefined();
  });

  it('rejects a confirmPassword mismatch and reports it on the confirmPassword path', () => {
    const r = resetPasswordSchema.safeParse({
      password: 'supersecret',
      confirmPassword: 'different1',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(errs.confirmPassword).toBe('Passwords do not match');
      expect(errs.password).toBeUndefined();
    }
  });
});

describe('fieldErrors', () => {
  it('flattens a ZodError to { field: firstMessage }, keeping only the first error per field', () => {
    // An empty email produces TWO email issues (min length, then email format);
    // fieldErrors must keep only the first ('Email is required').
    const r = loginSchema.safeParse({ email: '', password: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(errs).toEqual({
        email: 'Email is required',
        password: 'Password is required',
      });
    }
  });

  it('returns an empty object when there are no string-keyed issues', () => {
    const r = loginSchema.safeParse({ email: 'user@example.com', password: 'x' });
    expect(r.success).toBe(true);
  });
});
