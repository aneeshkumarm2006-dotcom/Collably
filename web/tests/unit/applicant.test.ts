import { describe, expect, it } from 'vitest';
import type { PublicApplication } from '@/lib/api/types';
import type { CreatorProfile } from '@/lib/shared';
import { applicantView } from '@/lib/business/applicant';

/**
 * Unit tests for the business-facing applicant view derivation
 * (`lib/business/applicant.ts`). Verifies name fallback, the largest-audience
 * "headline handle" selection (with '@' normalization + tie behavior), follower
 * count, niche/city/portfolio mapping, and the `profileHref` gate.
 */

// A minimal CreatorProfile — only the fields `applicantView` reads matter; the
// rest satisfy the shape so the helper has something well-formed to walk.
function makeCreator(overrides: Partial<CreatorProfile> = {}): CreatorProfile {
  return {
    _id: 'cr_1',
    userId: 'u_1',
    niche: [],
    location: {},
    socialHandles: {},
    contentTypes: [],
    portfolio: [],
    totalCollabsCompleted: 0,
    totalRewardsEarned: 0,
    isUGCOnly: false,
    isVerified: true,
    isSuspended: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as CreatorProfile;
}

// `applicantView` only touches `creator` + `creatorUser`, so a loose partial cast
// is enough — we never feed the result back into a typed API.
function makeApp(overrides: Partial<PublicApplication> = {}): PublicApplication {
  return { ...overrides } as PublicApplication;
}

describe('applicantView — name + avatar', () => {
  it('takes the display name from the joined creatorUser', () => {
    const app = makeApp({ creatorUser: { _id: 'u_1', name: 'Maya Bennett', role: 'creator', createdAt: '2026-01-01T00:00:00.000Z' } });
    expect(applicantView(app).name).toBe('Maya Bennett');
  });

  it("falls back to 'Creator' when no creatorUser is joined", () => {
    expect(applicantView(makeApp()).name).toBe('Creator');
  });

  it('passes the avatar through, defaulting to null when absent', () => {
    const withAvatar = makeApp({
      creatorUser: { _id: 'u_1', name: 'Maya', role: 'creator', avatar: 'https://img/a.jpg', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    expect(applicantView(withAvatar).avatar).toBe('https://img/a.jpg');
    // No creatorUser at all → null.
    expect(applicantView(makeApp()).avatar).toBeNull();
    // creatorUser present but avatar undefined → null.
    const noAvatar = makeApp({ creatorUser: { _id: 'u_1', name: 'Maya', role: 'creator', createdAt: '2026-01-01T00:00:00.000Z' } });
    expect(applicantView(noAvatar).avatar).toBeNull();
  });
});

describe('applicantView — headline handle (largest audience)', () => {
  it('picks the platform with the largest audience across instagram/youtube/tiktok', () => {
    const creator = makeCreator({
      socialHandles: {
        instagram: { handle: 'insta_low', link: 'l', followerCount: 5_000 },
        youtube: { handle: 'yt_top', link: 'l', subscriberCount: 10_000 },
        tiktok: { handle: 'tt_mid', link: 'l', followerCount: 2_000 },
      },
    });
    const view = applicantView(makeApp({ creator }));
    expect(view.handle).toBe('@yt_top');
    expect(view.followers).toBe(10_000);
  });

  it('uses tiktok when it has the largest following', () => {
    const creator = makeCreator({
      socialHandles: {
        instagram: { handle: 'ig', link: 'l', followerCount: 1_000 },
        tiktok: { handle: 'tt', link: 'l', followerCount: 9_000 },
      },
    });
    const view = applicantView(makeApp({ creator }));
    expect(view.handle).toBe('@tt');
    expect(view.followers).toBe(9_000);
  });

  it('reads youtube reach from subscriberCount (not followerCount)', () => {
    const creator = makeCreator({
      socialHandles: { youtube: { handle: 'yt_only', link: 'l', subscriberCount: 4_242 } },
    });
    const view = applicantView(makeApp({ creator }));
    expect(view.handle).toBe('@yt_only');
    expect(view.followers).toBe(4_242);
  });

  it('strips an existing leading @ and re-prefixes a single @', () => {
    const creator = makeCreator({
      socialHandles: { instagram: { handle: '@toronto.eats', link: 'l', followerCount: 100 } },
    });
    expect(applicantView(makeApp({ creator })).handle).toBe('@toronto.eats');
  });

  it('breaks ties in declaration order (instagram before youtube before tiktok)', () => {
    // Stable sort keeps the array order on equal counts; instagram is declared first.
    const creator = makeCreator({
      socialHandles: {
        instagram: { handle: 'ig_tie', link: 'l', followerCount: 5_000 },
        youtube: { handle: 'yt_tie', link: 'l', subscriberCount: 5_000 },
      },
    });
    expect(applicantView(makeApp({ creator })).handle).toBe('@ig_tie');
  });

  it('breaks a youtube/tiktok tie in favor of youtube', () => {
    const creator = makeCreator({
      socialHandles: {
        youtube: { handle: 'yt_tie', link: 'l', subscriberCount: 3_000 },
        tiktok: { handle: 'tt_tie', link: 'l', followerCount: 3_000 },
      },
    });
    expect(applicantView(makeApp({ creator })).handle).toBe('@yt_tie');
  });

  it('keeps the handle but leaves followers undefined when a count is missing', () => {
    const creator = makeCreator({
      socialHandles: { instagram: { handle: 'ig_nocount', link: 'l' } },
    });
    const view = applicantView(makeApp({ creator }));
    expect(view.handle).toBe('@ig_nocount');
    expect(view.followers).toBeUndefined();
  });

  it('treats a missing count as 0 when ranking against a counted platform', () => {
    const creator = makeCreator({
      socialHandles: {
        instagram: { handle: 'ig_nocount', link: 'l' }, // count undefined → ranks as 0
        youtube: { handle: 'yt_counted', link: 'l', subscriberCount: 1 },
      },
    });
    const view = applicantView(makeApp({ creator }));
    expect(view.handle).toBe('@yt_counted');
    expect(view.followers).toBe(1);
  });

  it('has no handle/followers when the creator has no social handles', () => {
    const view = applicantView(makeApp({ creator: makeCreator({ socialHandles: {} }) }));
    expect(view.handle).toBeUndefined();
    expect(view.followers).toBeUndefined();
  });

  it('has no handle/followers when no creator is joined at all', () => {
    const view = applicantView(makeApp());
    expect(view.handle).toBeUndefined();
    expect(view.followers).toBeUndefined();
  });
});

describe('applicantView — niche / city / portfolio / profileHref', () => {
  it('carries niche, city, and maps portfolio items to their imageUrl', () => {
    const creator = makeCreator({
      niche: ['Food', 'Travel'] as CreatorProfile['niche'],
      location: { city: 'Toronto', country: 'Canada' },
      portfolio: [
        { imageUrl: 'https://img/1.jpg', caption: 'one' },
        { imageUrl: 'https://img/2.jpg' },
      ],
    });
    const view = applicantView(makeApp({ creator }));
    expect(view.niche).toEqual(['Food', 'Travel']);
    expect(view.city).toBe('Toronto');
    expect(view.portfolio).toEqual(['https://img/1.jpg', 'https://img/2.jpg']);
  });

  it('defaults niche to [] and portfolio to [] and leaves city undefined when creator absent', () => {
    const view = applicantView(makeApp());
    expect(view.niche).toEqual([]);
    expect(view.portfolio).toEqual([]);
    expect(view.city).toBeUndefined();
  });

  it('leaves city undefined when the creator location has no city', () => {
    const view = applicantView(makeApp({ creator: makeCreator({ location: { country: 'Canada' } }) }));
    expect(view.city).toBeUndefined();
  });

  it('builds profileHref from the creator id only when the creator profile is joined', () => {
    const view = applicantView(makeApp({ creator: makeCreator({ _id: 'cr_99' }) }));
    expect(view.profileHref).toBe('/creator/cr_99');
  });

  it('omits profileHref when no creator profile is joined', () => {
    expect(applicantView(makeApp()).profileHref).toBeUndefined();
  });
});
