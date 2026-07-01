import { describe, expect, it } from 'vitest';
import type { PublicCampaign } from '@/lib/api/types';
import {
  TITLE_MAX,
  campaignFormFromCampaign,
  emptyCampaignForm,
  emptyDeliverable,
  hasErrors,
  toCampaignPayload,
  validateCampaignForm,
  type CampaignForm,
} from '@/lib/business/campaign-form';

/**
 * Unit tests for the campaign create/edit form model + payload mapping
 * (`lib/business/campaign-form.ts`): defaults, prefill from an owned campaign,
 * validation branches, and the backend-body mapping (`toCampaignPayload`).
 */

// A baseline *valid* form (clears every required-field error) we can mutate per
// test to exercise individual branches.
function validForm(overrides: Partial<CampaignForm> = {}): CampaignForm {
  return {
    ...emptyCampaignForm(),
    title: 'Tasting Menu for Two',
    description: 'Looking for a reel of our seven-course tasting.',
    category: 'Restaurant' as CampaignForm['category'],
    reward: { type: 'Experience', description: '7-course tasting', estimatedValue: '' },
    ...overrides,
  };
}

// Minimal owned-campaign response for prefill tests.
function makeCampaign(overrides: Partial<PublicCampaign> = {}): PublicCampaign {
  return { ...overrides } as PublicCampaign;
}

describe('emptyDeliverable', () => {
  it('returns the default Instagram Reel x1 deliverable', () => {
    expect(emptyDeliverable()).toEqual({
      platform: 'Instagram',
      contentType: 'Reel',
      quantity: 1,
      requirements: '',
    });
  });

  it('returns a fresh object each call (not a shared reference)', () => {
    expect(emptyDeliverable()).not.toBe(emptyDeliverable());
  });
});

describe('emptyCampaignForm', () => {
  it('returns the documented blank defaults', () => {
    const f = emptyCampaignForm();
    expect(f).toEqual({
      title: '',
      description: '',
      category: null,
      isRemote: false,
      location: {},
      reward: { type: 'Product', description: '', estimatedValue: '' },
      deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1, requirements: '' }],
      deadline: '',
      minFollowers: '0',
      tags: [],
      coverImage: null,
    });
  });

  it('seeds exactly one empty deliverable and no locationPin', () => {
    const f = emptyCampaignForm();
    expect(f.deliverables).toHaveLength(1);
    expect(f.locationPin).toBeUndefined();
  });
});

describe('campaignFormFromCampaign: prefill', () => {
  it('maps every field from a fully-populated campaign', () => {
    const c = makeCampaign({
      title: 'Brunch Collab',
      description: 'Weekend brunch coverage',
      category: 'Cafe',
      isRemote: false,
      location: {
        city: 'Toronto',
        state: 'ON',
        country: 'Canada',
        coordinates: { lat: 43.65, lng: -79.38 },
        address: '123 King St',
        placeId: 'place_abc',
      },
      reward: { type: 'Product', description: 'Free brunch', estimatedValue: 180 },
      deliverables: [
        { platform: 'Instagram', contentType: 'Story', quantity: 2, requirements: 'Tag us' },
      ],
      deadline: '2026-07-21T12:00:00.000Z',
      minFollowers: 1000,
      tags: ['food', 'brunch'],
      coverImage: 'https://img/cover.jpg',
    });
    const f = campaignFormFromCampaign(c);
    expect(f.title).toBe('Brunch Collab');
    expect(f.description).toBe('Weekend brunch coverage');
    expect(f.category).toBe('Cafe');
    expect(f.isRemote).toBe(false);
    expect(f.location).toEqual({ city: 'Toronto', state: 'ON', country: 'Canada' });
    expect(f.locationPin).toEqual({
      coordinates: { lat: 43.65, lng: -79.38 },
      address: '123 King St',
      placeId: 'place_abc',
    });
    expect(f.reward).toEqual({ type: 'Product', description: 'Free brunch', estimatedValue: '180' });
    expect(f.deliverables).toEqual([
      { platform: 'Instagram', contentType: 'Story', quantity: 2, requirements: 'Tag us' },
    ]);
    expect(f.deadline).toBe('2026-07-21');
    expect(f.minFollowers).toBe('1000');
    expect(f.tags).toEqual(['food', 'brunch']);
    expect(f.coverImage).toBe('https://img/cover.jpg');
  });

  it('applies safe defaults for a near-empty campaign', () => {
    const f = campaignFormFromCampaign(makeCampaign());
    expect(f.title).toBe('');
    expect(f.description).toBe('');
    expect(f.category).toBeNull();
    expect(f.isRemote).toBe(false);
    expect(f.location).toEqual({});
    expect(f.locationPin).toEqual({});
    expect(f.reward).toEqual({ type: 'Product', description: '', estimatedValue: '' });
    expect(f.deadline).toBe('');
    expect(f.minFollowers).toBe('0');
    expect(f.tags).toEqual([]);
    expect(f.coverImage).toBeNull();
  });

  it('converts a numeric estimatedValue to a string, including 0', () => {
    expect(campaignFormFromCampaign(makeCampaign({ reward: { type: 'Product', description: 'x', estimatedValue: 0 } })).reward.estimatedValue).toBe('0');
    expect(campaignFormFromCampaign(makeCampaign({ reward: { type: 'Product', description: 'x', estimatedValue: 250 } })).reward.estimatedValue).toBe('250');
  });

  it('uses an empty estimatedValue string when the campaign has no numeric value', () => {
    const f = campaignFormFromCampaign(makeCampaign({ reward: { type: 'Product', description: 'x' } }));
    expect(f.reward.estimatedValue).toBe('');
  });

  it('substitutes a single empty deliverable when the campaign has none', () => {
    const f = campaignFormFromCampaign(makeCampaign({ deliverables: [] }));
    expect(f.deliverables).toEqual([emptyDeliverable()]);
  });

  it('fills per-deliverable defaults (quantity → 1, requirements → "")', () => {
    const c = makeCampaign({
      deliverables: [{ platform: 'YouTube', contentType: 'Video' } as PublicCampaign['deliverables'][number]],
    });
    expect(campaignFormFromCampaign(c).deliverables).toEqual([
      { platform: 'YouTube', contentType: 'Video', quantity: 1, requirements: '' },
    ]);
  });

  it('carries only the present locationPin sub-fields', () => {
    const f = campaignFormFromCampaign(makeCampaign({ location: { city: 'Toronto', coordinates: { lat: 1, lng: 2 } } }));
    expect(f.location).toEqual({ city: 'Toronto' });
    expect(f.locationPin).toEqual({ coordinates: { lat: 1, lng: 2 } });
  });

  it('coerces a bad ISO deadline to an empty date-input value', () => {
    expect(campaignFormFromCampaign(makeCampaign({ deadline: 'not-a-date' })).deadline).toBe('');
    expect(campaignFormFromCampaign(makeCampaign({ deadline: '' })).deadline).toBe('');
  });

  it('coerces a truthy isRemote to a strict boolean', () => {
    expect(campaignFormFromCampaign(makeCampaign({ isRemote: true })).isRemote).toBe(true);
  });
});

describe('validateCampaignForm: required fields', () => {
  it('returns no errors for a valid form', () => {
    expect(validateCampaignForm(validForm())).toEqual({});
  });

  it('flags every missing required field on a blank form', () => {
    const errors = validateCampaignForm(emptyCampaignForm());
    expect(errors.title).toBeTruthy();
    expect(errors.description).toBeTruthy();
    expect(errors.category).toBeTruthy();
    expect(errors.rewardDescription).toBeTruthy();
    // The seeded deliverable + '0' min-followers + blank value are valid.
    expect(errors.deliverables).toBeUndefined();
    expect(errors.minFollowers).toBeUndefined();
    expect(errors.estimatedValue).toBeUndefined();
  });

  it('treats whitespace-only required fields as empty', () => {
    const errors = validateCampaignForm(validForm({ title: '   ', description: '\n\t' }));
    expect(errors.title).toBeTruthy();
    expect(errors.description).toBeTruthy();
  });

  it('flags a missing reward description', () => {
    expect(validateCampaignForm(validForm({ reward: { type: 'Product', description: '  ', estimatedValue: '' } })).rewardDescription).toBeTruthy();
  });
});

describe('validateCampaignForm: title length', () => {
  it('accepts a title exactly at TITLE_MAX', () => {
    expect(validateCampaignForm(validForm({ title: 'a'.repeat(TITLE_MAX) })).title).toBeUndefined();
  });

  it('rejects a title over TITLE_MAX with the length message', () => {
    const errors = validateCampaignForm(validForm({ title: 'a'.repeat(TITLE_MAX + 1) }));
    expect(errors.title).toContain(String(TITLE_MAX));
  });
});

describe('validateCampaignForm: estimatedValue', () => {
  const value = (estimatedValue: string) => validForm({ reward: { type: 'Experience', description: 'x', estimatedValue } });

  it('accepts a blank, zero, or positive amount', () => {
    expect(validateCampaignForm(value('')).estimatedValue).toBeUndefined();
    expect(validateCampaignForm(value('0')).estimatedValue).toBeUndefined();
    expect(validateCampaignForm(value('180')).estimatedValue).toBeUndefined();
  });

  it('rejects a non-numeric or negative amount', () => {
    expect(validateCampaignForm(value('abc')).estimatedValue).toBeTruthy();
    expect(validateCampaignForm(value('-5')).estimatedValue).toBeTruthy();
  });
});

describe('validateCampaignForm: minFollowers', () => {
  const min = (minFollowers: string) => validForm({ minFollowers });

  it('accepts a blank, zero, or whole positive number', () => {
    expect(validateCampaignForm(min('')).minFollowers).toBeUndefined();
    expect(validateCampaignForm(min('0')).minFollowers).toBeUndefined();
    expect(validateCampaignForm(min('5000')).minFollowers).toBeUndefined();
  });

  it('rejects a fractional, negative, or non-numeric value', () => {
    expect(validateCampaignForm(min('10.5')).minFollowers).toBeTruthy();
    expect(validateCampaignForm(min('-1')).minFollowers).toBeTruthy();
    expect(validateCampaignForm(min('abc')).minFollowers).toBeTruthy();
  });
});

describe('validateCampaignForm: deliverables', () => {
  it('flags an empty deliverables list', () => {
    expect(validateCampaignForm(validForm({ deliverables: [] })).deliverables).toBe('Add at least one deliverable.');
  });

  it('flags a deliverable with quantity below 1', () => {
    const errors = validateCampaignForm(validForm({ deliverables: [{ ...emptyDeliverable(), quantity: 0 }] }));
    expect(errors.deliverables).toBe('Each deliverable needs a quantity of 1 or more.');
  });

  it('flags a deliverable with a non-integer quantity', () => {
    const errors = validateCampaignForm(validForm({ deliverables: [{ ...emptyDeliverable(), quantity: 2.5 }] }));
    expect(errors.deliverables).toBe('Each deliverable needs a quantity of 1 or more.');
  });

  it('accepts a deliverable with quantity exactly 1', () => {
    expect(validateCampaignForm(validForm({ deliverables: [{ ...emptyDeliverable(), quantity: 1 }] })).deliverables).toBeUndefined();
  });
});

describe('hasErrors', () => {
  it('is false for an empty errors object', () => {
    expect(hasErrors({})).toBe(false);
  });

  it('is true when at least one error is present', () => {
    expect(hasErrors({ title: 'Give your campaign a title.' })).toBe(true);
  });
});

describe('toCampaignPayload', () => {
  it('trims text fields and maps a full form to the API body', () => {
    const f = validForm({
      title: '  Tasting Menu  ',
      description: '  A great reel  ',
      category: 'Restaurant' as CampaignForm['category'],
      isRemote: false,
      location: { city: '  Toronto  ', state: '  ON  ', country: '  Canada  ' },
      reward: { type: 'Experience', description: '  7-course tasting  ', estimatedValue: '180' },
      deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 2, requirements: '  Tag us  ' }],
      deadline: '2026-07-21',
      minFollowers: '500',
      tags: ['food'],
      coverImage: 'https://img/cover.jpg',
    });
    const payload = toCampaignPayload(f);
    expect(payload.title).toBe('Tasting Menu');
    expect(payload.description).toBe('A great reel');
    expect(payload.category).toBe('Restaurant');
    expect(payload.isRemote).toBe(false);
    expect(payload.location).toEqual({ city: 'Toronto', state: 'ON', country: 'Canada' });
    expect(payload.reward).toEqual({ type: 'Experience', description: '7-course tasting', estimatedValue: 180 });
    expect(payload.deliverables).toEqual([{ platform: 'Instagram', contentType: 'Reel', quantity: 2, requirements: 'Tag us' }]);
    expect(payload.deadline).toBe('2026-07-21T00:00:00.000Z');
    expect(payload.minFollowers).toBe(500);
    expect(payload.tags).toEqual(['food']);
    expect(payload.coverImage).toBe('https://img/cover.jpg');
  });

  it('drops empty optional fields (location, estimatedValue, requirements, deadline)', () => {
    const f = validForm({
      location: { city: '   ', state: '', country: undefined },
      reward: { type: 'Product', description: 'Free item', estimatedValue: '   ' },
      deliverables: [{ platform: 'Instagram', contentType: 'Reel', quantity: 1, requirements: '   ' }],
      deadline: '',
    });
    const payload = toCampaignPayload(f);
    expect(payload).not.toHaveProperty('location');
    expect(payload.reward).not.toHaveProperty('estimatedValue');
    expect(payload.deliverables[0]).not.toHaveProperty('requirements');
    expect(payload).not.toHaveProperty('deadline');
  });

  it('omits location entirely when the campaign is remote, even if fields are set', () => {
    const f = validForm({ isRemote: true, location: { city: 'Toronto' } });
    const payload = toCampaignPayload(f);
    expect(payload.isRemote).toBe(true);
    expect(payload).not.toHaveProperty('location');
  });

  it('includes coarse location when not remote and a field is present', () => {
    const payload = toCampaignPayload(validForm({ isRemote: false, location: { city: 'Toronto' } }));
    expect(payload.location).toEqual({ city: 'Toronto' });
  });

  it('merges coarse city/state/country with the carried-over location pin', () => {
    const f = validForm({
      isRemote: false,
      location: { city: 'Toronto' },
      locationPin: { coordinates: { lat: 43.65, lng: -79.38 }, address: '123 King St', placeId: 'p1' },
    });
    expect(toCampaignPayload(f).location).toEqual({
      city: 'Toronto',
      coordinates: { lat: 43.65, lng: -79.38 },
      address: '123 King St',
      placeId: 'p1',
    });
  });

  it('includes the pin even when coarse fields are absent', () => {
    const f = validForm({ isRemote: false, location: {}, locationPin: { coordinates: { lat: 1, lng: 2 } } });
    expect(toCampaignPayload(f).location).toEqual({ coordinates: { lat: 1, lng: 2 } });
  });

  it('defaults minFollowers to 0 when blank and parses it otherwise', () => {
    expect(toCampaignPayload(validForm({ minFollowers: '' })).minFollowers).toBe(0);
    expect(toCampaignPayload(validForm({ minFollowers: '  ' })).minFollowers).toBe(0);
    expect(toCampaignPayload(validForm({ minFollowers: '2500' })).minFollowers).toBe(2500);
  });

  it('keeps a zero estimatedValue (only blank is dropped)', () => {
    const payload = toCampaignPayload(validForm({ reward: { type: 'Product', description: 'x', estimatedValue: '0' } }));
    expect(payload.reward.estimatedValue).toBe(0);
  });

  it('converts the deadline date-input value to an ISO string', () => {
    expect(toCampaignPayload(validForm({ deadline: '2026-12-25' })).deadline).toBe('2026-12-25T00:00:00.000Z');
  });
});
