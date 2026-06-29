import { describe, expect, it } from 'vitest';
import { sanitizeNext } from '@/lib/auth/redirect';

describe('sanitizeNext', () => {
  it('returns a single-leading-slash same-origin path verbatim', () => {
    expect(sanitizeNext('/dashboard')).toBe('/dashboard');
    expect(sanitizeNext('/dashboard/creator')).toBe('/dashboard/creator');
    expect(sanitizeNext('/')).toBe('/');
    // Query strings and fragments are preserved (still same-origin paths).
    expect(sanitizeNext('/campaigns?sort=newest#top')).toBe('/campaigns?sort=newest#top');
  });

  it('returns null for null / undefined / empty falsy input', () => {
    expect(sanitizeNext(null)).toBeNull();
    expect(sanitizeNext(undefined)).toBeNull();
    expect(sanitizeNext('')).toBeNull();
  });

  it('returns null for a value that does not start with a slash', () => {
    expect(sanitizeNext('dashboard')).toBeNull();
    expect(sanitizeNext('https://evil.com')).toBeNull();
    expect(sanitizeNext('javascript:alert(1)')).toBeNull();
  });

  it('returns null for a protocol-relative URL (double leading slash)', () => {
    expect(sanitizeNext('//evil')).toBeNull();
    expect(sanitizeNext('//evil.com/path')).toBeNull();
  });

  it('returns null for a backslash-escaped open-redirect (/\\evil)', () => {
    expect(sanitizeNext('/\\evil')).toBeNull();
    expect(sanitizeNext('/\\evil.com')).toBeNull();
  });
});
