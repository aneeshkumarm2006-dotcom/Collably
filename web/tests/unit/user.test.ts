import { describe, expect, it } from 'vitest';
import type { PublicUser } from '@/lib/shared';
import {
  canTakeGatedAction,
  onboardingPath,
  postAuthPath,
  roleHome,
  toSessionUser,
  type SessionUser,
} from '@/lib/auth/user';

/** Build a minimal valid PublicUser, overridable per test. */
function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    _id: 'u_1',
    name: 'Maya Bennett',
    email: 'maya@example.com',
    role: 'creator',
    avatar: 'https://cdn.example.com/maya.png',
    isVerified: true,
    isOnboarded: true,
    isBanned: false,
    createdAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('toSessionUser', () => {
  it('maps the PublicUser fields plus the approved flag onto a SessionUser', () => {
    const session = toSessionUser(makeUser(), true);
    expect(session).toEqual<SessionUser>({
      id: 'u_1',
      name: 'Maya Bennett',
      email: 'maya@example.com',
      role: 'creator',
      avatar: 'https://cdn.example.com/maya.png',
      emailVerified: true,
      isOnboarded: true,
      approved: true,
    });
  });

  it('null-coalesces a missing or null avatar to null', () => {
    expect(toSessionUser(makeUser({ avatar: undefined }), false).avatar).toBeNull();
    expect(toSessionUser(makeUser({ avatar: null }), false).avatar).toBeNull();
  });

  it('keeps a present avatar untouched', () => {
    expect(toSessionUser(makeUser({ avatar: '/a.png' }), false).avatar).toBe('/a.png');
  });

  it('derives emailVerified from the source isVerified flag', () => {
    expect(toSessionUser(makeUser({ isVerified: false }), true).emailVerified).toBe(false);
    expect(toSessionUser(makeUser({ isVerified: true }), true).emailVerified).toBe(true);
  });

  it('passes the approved argument straight through (independent of the user)', () => {
    expect(toSessionUser(makeUser(), false).approved).toBe(false);
    expect(toSessionUser(makeUser(), true).approved).toBe(true);
  });

  it('carries isOnboarded across unchanged', () => {
    expect(toSessionUser(makeUser({ isOnboarded: false }), true).isOnboarded).toBe(false);
  });
});

describe('roleHome', () => {
  it('routes business and creator to their dashboards', () => {
    expect(roleHome('business')).toBe('/dashboard/business');
    expect(roleHome('creator')).toBe('/dashboard/creator');
  });

  it('falls back to the site root for admin (admins live in the separate app)', () => {
    expect(roleHome('admin')).toBe('/');
  });
});

describe('onboardingPath', () => {
  it('sends creators to the creator onboarding entry point', () => {
    expect(onboardingPath('creator')).toBe('/onboarding/creator');
  });

  it('sends non-creators (business / admin) to business onboarding', () => {
    expect(onboardingPath('business')).toBe('/onboarding/business');
    expect(onboardingPath('admin')).toBe('/onboarding/business');
  });
});

describe('postAuthPath', () => {
  it('routes an onboarded user to their role home', () => {
    expect(postAuthPath({ role: 'creator', isOnboarded: true })).toBe('/dashboard/creator');
    expect(postAuthPath({ role: 'business', isOnboarded: true })).toBe('/dashboard/business');
  });

  it('routes a not-yet-onboarded user to onboarding', () => {
    expect(postAuthPath({ role: 'creator', isOnboarded: false })).toBe('/onboarding/creator');
    expect(postAuthPath({ role: 'business', isOnboarded: false })).toBe('/onboarding/business');
  });
});

describe('canTakeGatedAction', () => {
  it('always permits admins regardless of approval', () => {
    expect(canTakeGatedAction({ role: 'admin', approved: false })).toBe(true);
    expect(canTakeGatedAction({ role: 'admin', approved: true })).toBe(true);
  });

  it('gates creators and businesses on the approved flag', () => {
    expect(canTakeGatedAction({ role: 'creator', approved: true })).toBe(true);
    expect(canTakeGatedAction({ role: 'creator', approved: false })).toBe(false);
    expect(canTakeGatedAction({ role: 'business', approved: true })).toBe(true);
    expect(canTakeGatedAction({ role: 'business', approved: false })).toBe(false);
  });
});
