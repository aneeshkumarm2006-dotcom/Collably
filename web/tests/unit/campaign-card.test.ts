import { describe, expect, it } from 'vitest';
import type { PublicCampaign } from '@/lib/api/types';
import type { BusinessProfile } from '@/lib/shared';
import { toCampaignCardData } from '@/lib/campaign-card';

/**
 * Unit tests for `toCampaignCardData`: the API `PublicCampaign` → card
 * view-model mapper. (Distinct from the component test in
 * `tests/components/campaign-card.test.tsx`, which renders the card.)
 */

function makeBusiness(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    _id: 'biz1',
    userId: 'user1',
    businessName: 'Maple & Oak',
    category: 'Restaurant',
    location: { city: 'Toronto', state: 'ON', country: 'CA' },
    socialLinks: {},
    logo: 'https://cdn/logo.png',
    isVerified: true,
    isSuspended: false,
    totalCampaigns: 3,
    totalCollabsCompleted: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCampaign(overrides: Partial<PublicCampaign> = {}): PublicCampaign {
  return {
    _id: 'cmp1',
    businessId: 'biz1',
    title: 'Tasting Menu for Two',
    description: 'A 7-course tasting',
    category: 'Restaurant',
    location: { city: 'Toronto', state: 'ON', country: 'CA' },
    isRemote: false,
    reward: { type: 'Experience', description: '7-course tasting', estimatedValue: 180 },
    deliverables: [
      { platform: 'Instagram', contentType: 'Reel', quantity: 2, requirements: 'Tag us' },
    ],
    deadline: '2026-07-21T12:00:00.000Z',
    minFollowers: 1000,
    status: 'Active',
    tags: ['food'],
    coverImage: 'https://cdn/cover.jpg',
    applicationsCount: 4,
    isFeatured: false,
    isSpam: false,
    business: makeBusiness(),
    ...overrides,
  };
}

describe('toCampaignCardData: happy path', () => {
  it('maps every core field from the campaign + joined business', () => {
    const card = toCampaignCardData(makeCampaign());
    expect(card).toMatchObject({
      id: 'cmp1',
      title: 'Tasting Menu for Two',
      category: 'Restaurant',
      coverImage: 'https://cdn/cover.jpg',
      reward: { type: 'Experience', description: '7-course tasting', estimatedValue: 180 },
      platform: 'Instagram',
      contentType: 'Reel',
      quantity: 2,
      deadline: '2026-07-21T12:00:00.000Z',
      applicationsCount: 4,
    });
    expect(card.business).toEqual({
      name: 'Maple & Oak',
      city: 'Toronto',
      avatar: 'https://cdn/logo.png',
    });
  });

  it('defaults closed to false for an Active campaign and leaves applicationStatus undefined', () => {
    const card = toCampaignCardData(makeCampaign({ status: 'Active' }));
    expect(card.closed).toBe(false);
    expect(card.applicationStatus).toBeUndefined();
  });
});

describe('toCampaignCardData: business fallbacks', () => {
  it('falls back to "A business" and a null avatar when no business is joined', () => {
    const card = toCampaignCardData(makeCampaign({ business: undefined }));
    expect(card.business.name).toBe('A business');
    expect(card.business.avatar).toBeNull();
  });

  it('coerces a missing business logo to null', () => {
    const card = toCampaignCardData(
      makeCampaign({ business: makeBusiness({ logo: null }) }),
    );
    expect(card.business.avatar).toBeNull();
  });
});

describe('toCampaignCardData: city / remote', () => {
  it('uses "Remote" when isRemote is true, ignoring any location.city', () => {
    const card = toCampaignCardData(
      makeCampaign({ isRemote: true, location: { city: 'Toronto' } }),
    );
    expect(card.business.city).toBe('Remote');
  });

  it('uses location.city when not remote', () => {
    const card = toCampaignCardData(
      makeCampaign({ isRemote: false, location: { city: 'Vancouver' } }),
    );
    expect(card.business.city).toBe('Vancouver');
  });

  it('leaves city undefined when not remote and no location is set', () => {
    const card = toCampaignCardData(makeCampaign({ isRemote: false, location: undefined }));
    expect(card.business.city).toBeUndefined();
  });
});

describe('toCampaignCardData: cover image normalization', () => {
  it('passes a present cover image through', () => {
    const card = toCampaignCardData(makeCampaign({ coverImage: 'https://x/y.png' }));
    expect(card.coverImage).toBe('https://x/y.png');
  });

  it('coerces an undefined cover image to null', () => {
    const card = toCampaignCardData(makeCampaign({ coverImage: undefined }));
    expect(card.coverImage).toBeNull();
  });

  it('coerces an explicit null cover image to null', () => {
    const card = toCampaignCardData(makeCampaign({ coverImage: null }));
    expect(card.coverImage).toBeNull();
  });
});

describe('toCampaignCardData: deliverables[0] extraction', () => {
  it('reads platform / contentType / quantity from the FIRST deliverable', () => {
    const card = toCampaignCardData(
      makeCampaign({
        deliverables: [
          { platform: 'YouTube', contentType: 'Long Video', quantity: 1 },
          { platform: 'TikTok', contentType: 'Short', quantity: 5 },
        ],
      }),
    );
    expect(card.platform).toBe('YouTube');
    expect(card.contentType).toBe('Long Video');
    expect(card.quantity).toBe(1);
  });

  it('leaves deliverable fields undefined when the deliverables array is empty', () => {
    const card = toCampaignCardData(makeCampaign({ deliverables: [] }));
    expect(card.platform).toBeUndefined();
    expect(card.contentType).toBeUndefined();
    expect(card.quantity).toBeUndefined();
  });

  it('does not throw and yields undefined fields when deliverables is missing', () => {
    const card = toCampaignCardData(
      makeCampaign({ deliverables: undefined as unknown as PublicCampaign['deliverables'] }),
    );
    expect(card.platform).toBeUndefined();
    expect(card.contentType).toBeUndefined();
    expect(card.quantity).toBeUndefined();
  });
});

describe('toCampaignCardData: closed default vs override', () => {
  it.each(['Draft', 'Paused', 'Closed', 'Completed'] as const)(
    'defaults closed to true for non-Active status %s',
    (status) => {
      expect(toCampaignCardData(makeCampaign({ status })).closed).toBe(true);
    },
  );

  it('opts.closed=false overrides a non-Active (Closed) status', () => {
    const card = toCampaignCardData(makeCampaign({ status: 'Closed' }), { closed: false });
    expect(card.closed).toBe(false);
  });

  it('opts.closed=true overrides an Active status', () => {
    const card = toCampaignCardData(makeCampaign({ status: 'Active' }), { closed: true });
    expect(card.closed).toBe(true);
  });
});

describe('toCampaignCardData: applicationStatus passthrough', () => {
  it.each(['applied', 'accepted', 'rejected'] as const)(
    'passes opts.applicationStatus=%s straight through',
    (applicationStatus) => {
      const card = toCampaignCardData(makeCampaign(), { applicationStatus });
      expect(card.applicationStatus).toBe(applicationStatus);
    },
  );

  it('defaults applicationStatus to undefined when opts is omitted entirely', () => {
    expect(toCampaignCardData(makeCampaign()).applicationStatus).toBeUndefined();
  });
});
