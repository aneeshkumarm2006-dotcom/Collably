import { describe, expect, it } from 'vitest';
import type { CreatorProfile } from '@/lib/shared';
import {
  digits,
  emptyCreatorForm,
  hasOneSocial,
  looksLikeUrl,
  normalizeUrl,
  numOrUndef,
  platformStarted,
  platformValid,
  creatorFormFromProfile,
  toCreatorPayload,
  type CreatorForm,
  MAX_PORTFOLIO,
} from '@/lib/onboarding/creator';

// ---------------------------------------------------------------------------
// looksLikeUrl: scheme optional, must look like a real domain (dot required).
// ---------------------------------------------------------------------------
describe('looksLikeUrl', () => {
  it('accepts bare domains and full URLs (the documented cases)', () => {
    expect(looksLikeUrl('site.com')).toBe(true);
    expect(looksLikeUrl('https://x.co/y')).toBe(true);
  });

  it('accepts http/https schemes, sub-domains, ports-less paths and query strings', () => {
    expect(looksLikeUrl('http://example.com')).toBe(true);
    expect(looksLikeUrl('https://example.com')).toBe(true);
    expect(looksLikeUrl('sub.example.co.uk')).toBe(true);
    expect(looksLikeUrl('instagram.com/me')).toBe(true);
    expect(looksLikeUrl('example.com/path?query=1')).toBe(true);
  });

  it('trims surrounding whitespace before testing', () => {
    expect(looksLikeUrl('  site.com  ')).toBe(true);
  });

  it('rejects plain text and strings without a dot (the documented cases)', () => {
    expect(looksLikeUrl('not a url')).toBe(false);
    expect(looksLikeUrl('justtext')).toBe(false);
  });

  it('rejects empty / whitespace-only input', () => {
    expect(looksLikeUrl('')).toBe(false);
    expect(looksLikeUrl('   ')).toBe(false);
  });

  it('requires a 2+ char trailing label after the final dot', () => {
    // 'b' is a single char, so the TLD requirement (\w-{2,}) fails.
    expect(looksLikeUrl('a.b')).toBe(false);
    expect(looksLikeUrl('ab.cd')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeUrl: add https:// only when scheme missing, leave http(s) alone.
// ---------------------------------------------------------------------------
describe('normalizeUrl', () => {
  it('adds https:// when the scheme is missing', () => {
    expect(normalizeUrl('site.com')).toBe('https://site.com');
    expect(normalizeUrl('x.co/y')).toBe('https://x.co/y');
  });

  it('leaves an existing http(s) scheme alone (case-insensitive)', () => {
    expect(normalizeUrl('http://x.com')).toBe('http://x.com');
    expect(normalizeUrl('https://x.com')).toBe('https://x.com');
    expect(normalizeUrl('HTTP://x.com')).toBe('HTTP://x.com');
  });

  it('trims before deciding, then prefixes the trimmed value', () => {
    expect(normalizeUrl('  site.com  ')).toBe('https://site.com');
  });

  it('keeps an empty / whitespace-only string empty (never prefixes "https://")', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// platformValid: handle AND valid link.
// ---------------------------------------------------------------------------
describe('platformValid', () => {
  it('is true only with a non-empty handle AND a valid link', () => {
    expect(platformValid('me', 'site.com')).toBe(true);
    expect(platformValid('me', 'https://x.co/me')).toBe(true);
  });

  it('is false when the handle is blank', () => {
    expect(platformValid('', 'site.com')).toBe(false);
    expect(platformValid('   ', 'site.com')).toBe(false);
  });

  it('is false when the link is missing or not URL-like', () => {
    expect(platformValid('me', '')).toBe(false);
    expect(platformValid('me', 'not a url')).toBe(false);
    expect(platformValid('me', 'justtext')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// platformStarted: handle OR link (any non-empty text).
// ---------------------------------------------------------------------------
describe('platformStarted', () => {
  it('is true when either handle or link has content', () => {
    expect(platformStarted('me', '')).toBe(true);
    expect(platformStarted('', 'anything')).toBe(true);
    expect(platformStarted('me', 'site.com')).toBe(true);
  });

  it('is false when both are blank or whitespace-only', () => {
    expect(platformStarted('', '')).toBe(false);
    expect(platformStarted('   ', '   ')).toBe(false);
  });

  it('counts a link that is not URL-like (only checks non-emptiness)', () => {
    expect(platformStarted('', 'not a url')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hasOneSocial: at least one platform valid.
// ---------------------------------------------------------------------------
describe('hasOneSocial', () => {
  const withIg = (handle: string, link: string): CreatorForm => {
    const f = emptyCreatorForm();
    f.social.igHandle = handle;
    f.social.igLink = link;
    return f;
  };

  it('is false for an empty form', () => {
    expect(hasOneSocial(emptyCreatorForm())).toBe(false);
  });

  it('is true when any single platform is valid', () => {
    expect(hasOneSocial(withIg('me', 'instagram.com/me'))).toBe(true);

    const yt = emptyCreatorForm();
    yt.social.ytHandle = 'chan';
    yt.social.ytLink = 'youtube.com/chan';
    expect(hasOneSocial(yt)).toBe(true);

    const tt = emptyCreatorForm();
    tt.social.ttHandle = 'tk';
    tt.social.ttLink = 'tiktok.com/@tk';
    expect(hasOneSocial(tt)).toBe(true);
  });

  it('is false when a platform is started but its link is invalid', () => {
    expect(hasOneSocial(withIg('me', 'not a url'))).toBe(false);
    expect(hasOneSocial(withIg('', 'instagram.com/me'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// digits: keep only 0-9.
// ---------------------------------------------------------------------------
describe('digits', () => {
  it('strips every non-digit character', () => {
    expect(digits('1,234')).toBe('1234');
    expect(digits('12k')).toBe('12');
    expect(digits('  4 5 ')).toBe('45');
  });

  it('returns "" when there are no digits', () => {
    expect(digits('abc')).toBe('');
    expect(digits('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// numOrUndef: finite number or undefined (never NaN/null).
// ---------------------------------------------------------------------------
describe('numOrUndef', () => {
  it('returns undefined for empty / whitespace input', () => {
    expect(numOrUndef('')).toBeUndefined();
    expect(numOrUndef('   ')).toBeUndefined();
  });

  it('parses a numeric string', () => {
    expect(numOrUndef('123')).toBe(123);
    expect(numOrUndef('  42  ')).toBe(42);
    expect(numOrUndef('12.5')).toBe(12.5);
    expect(numOrUndef('0')).toBe(0);
  });

  it('returns undefined for non-numeric or non-finite input', () => {
    expect(numOrUndef('x')).toBeUndefined();
    expect(numOrUndef('1,234')).toBeUndefined(); // comma is not stripped here
    expect(numOrUndef('Infinity')).toBeUndefined();
  });

  it('tolerates null/undefined via the ?? "" guard', () => {
    expect(numOrUndef(undefined as unknown as string)).toBeUndefined();
    expect(numOrUndef(null as unknown as string)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// emptyCreatorForm: shape.
// ---------------------------------------------------------------------------
describe('emptyCreatorForm', () => {
  it('returns the fully-blank form shape', () => {
    expect(emptyCreatorForm()).toEqual({
      bio: '',
      niche: [],
      location: {},
      social: {
        igHandle: '',
        igLink: '',
        igFollowers: '',
        igEngagement: '',
        ytHandle: '',
        ytLink: '',
        ytSubs: '',
        ttHandle: '',
        ttLink: '',
        ttFollowers: '',
      },
      contentTypes: [],
      isUGCOnly: false,
      portfolio: [],
    });
  });

  it('returns a fresh object each call (no shared references)', () => {
    const a = emptyCreatorForm();
    const b = emptyCreatorForm();
    expect(a).not.toBe(b);
    expect(a.niche).not.toBe(b.niche);
    expect(a.social).not.toBe(b.social);
  });

  it('exposes MAX_PORTFOLIO as 6', () => {
    expect(MAX_PORTFOLIO).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// creatorFormFromProfile: prefill from an existing profile.
// ---------------------------------------------------------------------------
describe('creatorFormFromProfile', () => {
  it('maps an empty/partial profile to the blank form (defaults applied)', () => {
    expect(creatorFormFromProfile({} as CreatorProfile)).toEqual(emptyCreatorForm());
  });

  it('hydrates every field from a fully-populated profile', () => {
    const profile = {
      bio: 'Creator bio',
      niche: ['Food', 'Tech'],
      location: { city: 'NYC', country: 'US' },
      socialHandles: {
        instagram: { handle: 'ig', link: 'https://ig.com/me', followerCount: 1000, engagementRate: 4.5 },
        youtube: { handle: 'yt', link: 'https://yt.com/me', subscriberCount: 500 },
        tiktok: { handle: 'tt', link: 'https://tt.com/me', followerCount: 250 },
      },
      contentTypes: ['Reel'],
      isUGCOnly: true,
      portfolio: [{ imageUrl: 'http://img', caption: 'c' }],
    } as unknown as CreatorProfile;

    expect(creatorFormFromProfile(profile)).toEqual({
      bio: 'Creator bio',
      niche: ['Food', 'Tech'],
      location: { city: 'NYC', country: 'US' },
      social: {
        igHandle: 'ig',
        igLink: 'https://ig.com/me',
        igFollowers: '1000',
        igEngagement: '4.5',
        ytHandle: 'yt',
        ytLink: 'https://yt.com/me',
        ytSubs: '500',
        ttHandle: 'tt',
        ttLink: 'https://tt.com/me',
        ttFollowers: '250',
      },
      contentTypes: ['Reel'],
      isUGCOnly: true,
      portfolio: [{ imageUrl: 'http://img', caption: 'c' }],
    });
  });

  it('renders a numeric 0 count as "0" (not blank: numStr only blanks null/undefined)', () => {
    const profile = {
      socialHandles: {
        instagram: { handle: 'ig', link: 'https://ig.com/me', followerCount: 0, engagementRate: 0 },
      },
    } as unknown as CreatorProfile;
    const form = creatorFormFromProfile(profile);
    expect(form.social.igFollowers).toBe('0');
    expect(form.social.igEngagement).toBe('0');
  });

  it('blanks counts that are absent and keeps handle/link strings empty', () => {
    const profile = {
      socialHandles: { youtube: { handle: 'yt', link: 'https://yt.com/me' } },
    } as unknown as CreatorProfile;
    const form = creatorFormFromProfile(profile);
    expect(form.social.ytSubs).toBe('');
    expect(form.social.igHandle).toBe('');
    expect(form.social.igLink).toBe('');
  });

  it('copies array fields rather than aliasing the source arrays', () => {
    const profile = {
      niche: ['Food'],
      contentTypes: ['Reel'],
      portfolio: [{ imageUrl: 'x' }],
      socialHandles: {},
    } as unknown as CreatorProfile;
    const form = creatorFormFromProfile(profile);
    expect(form.niche).not.toBe(profile.niche);
    expect(form.contentTypes).not.toBe(profile.contentTypes);
    expect(form.portfolio).not.toBe(profile.portfolio);
    expect(form.location).not.toBe(profile.location);
  });
});

// ---------------------------------------------------------------------------
// toCreatorPayload: map form → PUT body, dropping empties, normalizing links.
// ---------------------------------------------------------------------------
describe('toCreatorPayload', () => {
  it('emits only the always-present keys for a blank form', () => {
    const payload = toCreatorPayload(emptyCreatorForm());
    expect(payload).toEqual({
      niche: [],
      socialHandles: {},
      isUGCOnly: false,
      portfolio: [],
    });
    // documented invariant: these keys are ALWAYS present
    expect(payload).toHaveProperty('niche');
    expect(payload).toHaveProperty('socialHandles');
    expect(payload).toHaveProperty('isUGCOnly');
    expect(payload).toHaveProperty('portfolio');
    // dropped-when-empty keys
    expect(payload).not.toHaveProperty('bio');
    expect(payload).not.toHaveProperty('location');
    expect(payload).not.toHaveProperty('contentTypes');
  });

  it('builds a full payload: trims bio, trims location, includes only valid platforms, normalizes links, parses counts', () => {
    const f = emptyCreatorForm();
    f.bio = '  My bio  ';
    f.niche = ['Food', 'Tech'];
    f.location = { city: '  NYC  ', state: '', country: 'US' };
    f.social.igHandle = '  ig  ';
    f.social.igLink = 'instagram.com/me'; // no scheme -> normalized
    f.social.igFollowers = '1000';
    f.social.igEngagement = '4.5';
    f.social.ytHandle = 'yt';
    f.social.ytLink = 'https://yt.com/me'; // already has scheme
    f.social.ytSubs = '5000';
    f.social.ttHandle = 'tt';
    f.social.ttLink = 'tiktok.com/@tt';
    f.social.ttFollowers = ''; // blank -> followerCount omitted
    f.contentTypes = ['Reel', 'Story'];
    f.isUGCOnly = true;
    f.portfolio = [{ imageUrl: 'http://img' }];

    expect(toCreatorPayload(f)).toEqual({
      bio: 'My bio',
      niche: ['Food', 'Tech'],
      location: { city: 'NYC', country: 'US' }, // empty state dropped
      socialHandles: {
        instagram: {
          handle: 'ig',
          link: 'https://instagram.com/me',
          followerCount: 1000,
          engagementRate: 4.5,
        },
        youtube: { handle: 'yt', link: 'https://yt.com/me', subscriberCount: 5000 },
        tiktok: { handle: 'tt', link: 'https://tiktok.com/@tt' }, // no followerCount
      },
      contentTypes: ['Reel', 'Story'],
      isUGCOnly: true,
      portfolio: [{ imageUrl: 'http://img' }],
    });
  });

  it('excludes a platform that was started but has an invalid link', () => {
    const f = emptyCreatorForm();
    f.social.igHandle = 'ig';
    f.social.igLink = 'not a url';
    const payload = toCreatorPayload(f);
    expect(payload.socialHandles).toEqual({});
    expect(payload.socialHandles).not.toHaveProperty('instagram');
  });

  it('excludes a platform with a valid link but no handle, and vice-versa', () => {
    const noHandle = emptyCreatorForm();
    noHandle.social.igLink = 'instagram.com/me';
    expect(toCreatorPayload(noHandle).socialHandles).toEqual({});

    const noLink = emptyCreatorForm();
    noLink.social.igHandle = 'ig';
    expect(toCreatorPayload(noLink).socialHandles).toEqual({});
  });

  it('omits numeric sub-fields when blank but keeps the valid platform', () => {
    const f = emptyCreatorForm();
    f.social.igHandle = 'ig';
    f.social.igLink = 'instagram.com/me';
    f.social.igFollowers = '';
    f.social.igEngagement = '';
    const ig = toCreatorPayload(f).socialHandles.instagram;
    expect(ig).toEqual({ handle: 'ig', link: 'https://instagram.com/me' });
    expect(ig).not.toHaveProperty('followerCount');
    expect(ig).not.toHaveProperty('engagementRate');
  });

  it('drops contentTypes when empty but includes it when set', () => {
    const empty = emptyCreatorForm();
    expect(toCreatorPayload(empty)).not.toHaveProperty('contentTypes');

    const withTypes = emptyCreatorForm();
    withTypes.contentTypes = ['UGC'];
    expect(toCreatorPayload(withTypes).contentTypes).toEqual(['UGC']);
  });

  it('drops a whitespace-only bio and a whitespace-only location', () => {
    const f = emptyCreatorForm();
    f.bio = '   ';
    f.location = { city: '   ', state: '  ', country: '   ' };
    const payload = toCreatorPayload(f);
    expect(payload).not.toHaveProperty('bio');
    expect(payload).not.toHaveProperty('location');
  });

  it('always passes isUGCOnly through (false and true)', () => {
    expect(toCreatorPayload(emptyCreatorForm()).isUGCOnly).toBe(false);
    const f = emptyCreatorForm();
    f.isUGCOnly = true;
    expect(toCreatorPayload(f).isUGCOnly).toBe(true);
  });
});
