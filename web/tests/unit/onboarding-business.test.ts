import { describe, expect, it } from 'vitest';
import type { BusinessProfile } from '@/lib/shared';
import {
  businessFormFromProfile,
  emptyBusinessForm,
  toBusinessPayload,
} from '@/lib/onboarding/business';

// ---------------------------------------------------------------------------
// emptyBusinessForm — blank shape, optionally seeded with a business name.
// ---------------------------------------------------------------------------
describe('emptyBusinessForm', () => {
  it('returns a fully-blank form when no name is given', () => {
    expect(emptyBusinessForm()).toEqual({
      businessName: '',
      description: '',
      category: null,
      location: {},
      website: '',
      socialLinks: { instagram: '', youtube: '', tiktok: '' },
      logo: null,
    });
  });

  it('seeds businessName when a name is provided, leaving everything else blank', () => {
    const form = emptyBusinessForm('Acme Co');
    expect(form.businessName).toBe('Acme Co');
    expect(form).toEqual({
      businessName: 'Acme Co',
      description: '',
      category: null,
      location: {},
      website: '',
      socialLinks: { instagram: '', youtube: '', tiktok: '' },
      logo: null,
    });
  });

  it('returns a fresh object each call (no shared references)', () => {
    const a = emptyBusinessForm();
    const b = emptyBusinessForm();
    expect(a).not.toBe(b);
    expect(a.socialLinks).not.toBe(b.socialLinks);
    expect(a.location).not.toBe(b.location);
  });
});

// ---------------------------------------------------------------------------
// businessFormFromProfile — prefill from an existing business profile.
// ---------------------------------------------------------------------------
describe('businessFormFromProfile', () => {
  it('maps an empty/partial profile to the blank form (defaults applied)', () => {
    expect(businessFormFromProfile({} as BusinessProfile)).toEqual(emptyBusinessForm());
  });

  it('hydrates every field from a fully-populated profile', () => {
    const profile = {
      businessName: 'Acme',
      description: 'We sell things',
      category: 'Tech',
      location: { city: 'NYC', state: 'NY', country: 'US' },
      website: 'https://acme.com',
      socialLinks: { instagram: '@acme', youtube: 'acme', tiktok: '@acme.tt' },
      logo: 'http://logo.png',
    } as unknown as BusinessProfile;

    expect(businessFormFromProfile(profile)).toEqual({
      businessName: 'Acme',
      description: 'We sell things',
      category: 'Tech',
      location: { city: 'NYC', state: 'NY', country: 'US' },
      website: 'https://acme.com',
      socialLinks: { instagram: '@acme', youtube: 'acme', tiktok: '@acme.tt' },
      logo: 'http://logo.png',
    });
  });

  it('includes only the location sub-fields that are set (truthy)', () => {
    const profile = {
      businessName: 'Acme',
      location: { city: 'NYC' },
    } as unknown as BusinessProfile;
    expect(businessFormFromProfile(profile).location).toEqual({ city: 'NYC' });
  });

  it('defaults a missing category to null and missing socialLinks to empty strings', () => {
    const profile = { businessName: 'Acme' } as unknown as BusinessProfile;
    const form = businessFormFromProfile(profile);
    expect(form.category).toBeNull();
    expect(form.socialLinks).toEqual({ instagram: '', youtube: '', tiktok: '' });
  });

  it('defaults a null logo through to null', () => {
    const profile = { businessName: 'Acme', logo: null } as unknown as BusinessProfile;
    expect(businessFormFromProfile(profile).logo).toBeNull();
  });

  it('fills a partially-set socialLinks object, blanking the missing ones', () => {
    const profile = {
      businessName: 'Acme',
      socialLinks: { instagram: '@acme' },
    } as unknown as BusinessProfile;
    expect(businessFormFromProfile(profile).socialLinks).toEqual({
      instagram: '@acme',
      youtube: '',
      tiktok: '',
    });
  });
});

// ---------------------------------------------------------------------------
// toBusinessPayload — map form → PUT body, trimming + dropping empties.
// ---------------------------------------------------------------------------
describe('toBusinessPayload', () => {
  it('emits only the always-present keys for a minimal form (name + category)', () => {
    const f = emptyBusinessForm('  Acme  ');
    f.category = 'Tech';
    const payload = toBusinessPayload(f);
    expect(payload).toEqual({ businessName: 'Acme', category: 'Tech' });
    // dropped-when-empty keys
    expect(payload).not.toHaveProperty('description');
    expect(payload).not.toHaveProperty('location');
    expect(payload).not.toHaveProperty('website');
    expect(payload).not.toHaveProperty('socialLinks');
    expect(payload).not.toHaveProperty('logo');
  });

  it('trims businessName and passes category through unchanged', () => {
    const f = emptyBusinessForm('   Spaced Name   ');
    f.category = 'Beauty';
    const payload = toBusinessPayload(f);
    expect(payload.businessName).toBe('Spaced Name');
    expect(payload.category).toBe('Beauty');
  });

  it('builds a full payload: trims description/website/socials, drops empty location/social fields', () => {
    const f = emptyBusinessForm('  Acme Co  ');
    f.category = 'Restaurant';
    f.description = '  We cook  ';
    f.location = { city: '  NYC  ', state: '', country: 'US' };
    f.website = '  acme.com  ';
    f.socialLinks = { instagram: '  @a  ', youtube: '', tiktok: 'tt' };
    f.logo = 'http://logo.png';

    expect(toBusinessPayload(f)).toEqual({
      businessName: 'Acme Co',
      category: 'Restaurant',
      description: 'We cook',
      location: { city: 'NYC', country: 'US' }, // empty state dropped
      website: 'acme.com',
      socialLinks: { instagram: '@a', tiktok: 'tt' }, // empty youtube dropped
      logo: 'http://logo.png',
    });
  });

  it('includes socialLinks only when at least one link is set', () => {
    const none = emptyBusinessForm('Acme');
    none.category = 'Tech';
    none.socialLinks = { instagram: '   ', youtube: '', tiktok: '' };
    expect(toBusinessPayload(none)).not.toHaveProperty('socialLinks');

    const one = emptyBusinessForm('Acme');
    one.category = 'Tech';
    one.socialLinks = { instagram: '', youtube: 'yt', tiktok: '' };
    expect(toBusinessPayload(one).socialLinks).toEqual({ youtube: 'yt' });
  });

  it('drops a whitespace-only description, website and location', () => {
    const f = emptyBusinessForm('Acme');
    f.category = 'Tech';
    f.description = '   ';
    f.website = '   ';
    f.location = { city: '  ', state: '  ', country: '  ' };
    const payload = toBusinessPayload(f);
    expect(payload).not.toHaveProperty('description');
    expect(payload).not.toHaveProperty('website');
    expect(payload).not.toHaveProperty('location');
  });

  it('drops the logo when it is null or empty, includes it when set', () => {
    const nullLogo = emptyBusinessForm('Acme');
    nullLogo.category = 'Tech';
    nullLogo.logo = null;
    expect(toBusinessPayload(nullLogo)).not.toHaveProperty('logo');

    const emptyLogo = emptyBusinessForm('Acme');
    emptyLogo.category = 'Tech';
    emptyLogo.logo = '';
    expect(toBusinessPayload(emptyLogo)).not.toHaveProperty('logo');

    const setLogo = emptyBusinessForm('Acme');
    setLogo.category = 'Tech';
    setLogo.logo = 'data:image/png;base64,abc';
    expect(toBusinessPayload(setLogo).logo).toBe('data:image/png;base64,abc');
  });

  it('trims a whitespace-only businessName down to "" (no gating in the mapper)', () => {
    const f = emptyBusinessForm('     ');
    f.category = 'Tech';
    expect(toBusinessPayload(f).businessName).toBe('');
  });

  it('passes a null category straight through (documents actual behavior — gating is upstream)', () => {
    const f = emptyBusinessForm('Acme');
    // category left as its default null
    const payload = toBusinessPayload(f);
    expect(payload).toHaveProperty('category');
    expect(payload.category).toBeNull();
  });
});
