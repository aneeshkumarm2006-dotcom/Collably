import { describe, expect, it } from 'vitest';
import type { CreatorProfile } from '@/lib/shared';
import { creatorProfileCompletion } from '@/lib/creator/profile-completion';

/**
 * Empty creator profile: all six profile-editable sections blank. The factory
 * lets each test fill exactly the fields under test.
 */
function makeCreator(overrides: Partial<CreatorProfile> = {}): CreatorProfile {
  return {
    _id: 'cre1',
    userId: 'u1',
    bio: '',
    niche: [],
    location: {},
    socialHandles: {},
    contentTypes: [],
    portfolio: [],
    totalCollabsCompleted: 0,
    totalRewardsEarned: 0,
    isUGCOnly: false,
    isVerified: false,
    isSuspended: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const ALL_MISSING = [
  'Add a bio',
  'Pick your niche',
  'Set your location',
  'Connect a platform',
  'Choose content types',
  'Add portfolio work',
];

describe('creatorProfileCompletion: boundaries', () => {
  it('reports 0% and lists all six sections for a wholly empty profile', () => {
    const result = creatorProfileCompletion(makeCreator());
    expect(result.percent).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.total).toBe(6);
    expect(result.missing).toEqual(ALL_MISSING);
  });

  it('reports 100% with no missing items for a fully filled profile', () => {
    const result = creatorProfileCompletion(
      makeCreator({
        bio: 'I make food content',
        niche: ['Food'],
        location: { city: 'Toronto' },
        socialHandles: { instagram: { handle: 'me', link: 'https://insta/me' } },
        contentTypes: ['Reel'],
        portfolio: [{ imageUrl: 'https://cdn/a.jpg' }],
      }),
    );
    expect(result.percent).toBe(100);
    expect(result.completed).toBe(6);
    expect(result.total).toBe(6);
    expect(result.missing).toEqual([]);
  });
});

describe('creatorProfileCompletion: rounded partial percentages', () => {
  it('rounds 1 of 6 complete to 17%', () => {
    const result = creatorProfileCompletion(makeCreator({ bio: 'hello' }));
    expect(result.completed).toBe(1);
    expect(result.percent).toBe(17); // 16.66… → 17
  });

  it('rounds 5 of 6 complete to 83%', () => {
    const result = creatorProfileCompletion(
      makeCreator({
        bio: 'hi',
        niche: ['Food'],
        location: { city: 'Toronto' },
        socialHandles: { tiktok: { handle: 't', link: 'https://tt/t' } },
        contentTypes: ['Reel'],
        // portfolio left empty → missing
      }),
    );
    expect(result.completed).toBe(5);
    expect(result.percent).toBe(83); // 83.33… → 83
    expect(result.missing).toEqual(['Add portfolio work']);
  });

  it('reports a clean 50% at 3 of 6', () => {
    const result = creatorProfileCompletion(
      makeCreator({ bio: 'hi', niche: ['Food'], location: { city: 'Toronto' } }),
    );
    expect(result.completed).toBe(3);
    expect(result.percent).toBe(50);
    expect(result.missing).toEqual([
      'Connect a platform',
      'Choose content types',
      'Add portfolio work',
    ]);
  });
});

describe('creatorProfileCompletion: whitespace-only fields do not count', () => {
  it('treats a whitespace-only bio as missing', () => {
    const result = creatorProfileCompletion(makeCreator({ bio: '   ' }));
    expect(result.completed).toBe(0);
    expect(result.missing).toContain('Add a bio');
  });

  it('treats a whitespace-only location city as missing', () => {
    const result = creatorProfileCompletion(makeCreator({ location: { city: '  ' } }));
    expect(result.missing).toContain('Set your location');
  });
});

describe('creatorProfileCompletion: hasAnySocial (Connect a platform)', () => {
  it.each([
    ['instagram', { instagram: { handle: 'ig', link: 'https://insta/ig' } }],
    ['youtube', { youtube: { handle: 'yt', link: 'https://yt/yt' } }],
    ['tiktok', { tiktok: { handle: 'tt', link: 'https://tt/tt' } }],
  ] as const)('counts the platform as connected when only %s has a handle', (_name, socialHandles) => {
    const result = creatorProfileCompletion(makeCreator({ socialHandles }));
    expect(result.missing).not.toContain('Connect a platform');
  });

  it('does not count a platform present but with an empty handle', () => {
    const result = creatorProfileCompletion(
      makeCreator({ socialHandles: { instagram: { handle: '', link: 'https://insta/x' } } }),
    );
    expect(result.missing).toContain('Connect a platform');
  });

  it('treats undefined socialHandles as no platform connected', () => {
    const result = creatorProfileCompletion(
      makeCreator({ socialHandles: undefined as unknown as CreatorProfile['socialHandles'] }),
    );
    expect(result.missing).toContain('Connect a platform');
  });
});

describe('creatorProfileCompletion: list fields', () => {
  it('counts niche / contentTypes / portfolio as done once non-empty', () => {
    const result = creatorProfileCompletion(
      makeCreator({
        niche: ['Food', 'Travel'],
        contentTypes: ['Reel'],
        portfolio: [{ imageUrl: 'https://cdn/a.jpg' }, { imageUrl: 'https://cdn/b.jpg' }],
      }),
    );
    expect(result.missing).not.toContain('Pick your niche');
    expect(result.missing).not.toContain('Choose content types');
    expect(result.missing).not.toContain('Add portfolio work');
    expect(result.completed).toBe(3);
  });
});
