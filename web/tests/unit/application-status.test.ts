import { describe, expect, it } from 'vitest';
import type { ApplicationStatus } from '@/lib/shared';
import type { PublicApplication } from '@/lib/api/types';
import {
  applicationStatusByCampaign,
  cardApplicationStatus,
} from '@/lib/creator/application-status';

describe('cardApplicationStatus', () => {
  it('maps Pending → applied', () => {
    expect(cardApplicationStatus('Pending')).toBe('applied');
  });

  it.each(['Accepted', 'Overdue', 'Completed'] as const)('maps %s → accepted', (status) => {
    expect(cardApplicationStatus(status)).toBe('accepted');
  });

  it.each(['Rejected', 'Cancelled'] as const)('maps %s → rejected', (status) => {
    expect(cardApplicationStatus(status)).toBe('rejected');
  });

  it('maps Withdrawn → undefined (no badge)', () => {
    expect(cardApplicationStatus('Withdrawn')).toBeUndefined();
  });

  it('covers every ApplicationStatus value without throwing', () => {
    const all: ApplicationStatus[] = [
      'Pending',
      'Accepted',
      'Rejected',
      'Withdrawn',
      'Completed',
      'Cancelled',
      'Overdue',
    ];
    for (const s of all) {
      const badge = cardApplicationStatus(s);
      expect([undefined, 'applied', 'accepted', 'rejected']).toContain(badge);
    }
  });
});

function makeApp(overrides: Partial<PublicApplication> = {}): PublicApplication {
  return {
    _id: 'app1',
    campaignId: 'cmp1',
    creatorId: 'cre1',
    businessId: 'biz1',
    status: 'Pending',
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  } as PublicApplication;
}

describe('applicationStatusByCampaign', () => {
  it('returns an empty map for no applications', () => {
    expect(applicationStatusByCampaign([])).toEqual({});
  });

  it('builds a { campaignId → badge } map', () => {
    const map = applicationStatusByCampaign([
      makeApp({ campaignId: 'c1', status: 'Pending' }),
      makeApp({ campaignId: 'c2', status: 'Accepted' }),
      makeApp({ campaignId: 'c3', status: 'Rejected' }),
    ]);
    expect(map).toEqual({ c1: 'applied', c2: 'accepted', c3: 'rejected' });
  });

  it('skips applications whose status produces no badge (Withdrawn)', () => {
    const map = applicationStatusByCampaign([
      makeApp({ campaignId: 'c1', status: 'Withdrawn' }),
      makeApp({ campaignId: 'c2', status: 'Pending' }),
    ]);
    expect(map).toEqual({ c2: 'applied' });
    expect(map).not.toHaveProperty('c1');
  });

  it('lets a later application overwrite an earlier badge for the same campaign', () => {
    const map = applicationStatusByCampaign([
      makeApp({ campaignId: 'c1', status: 'Pending' }), // applied
      makeApp({ campaignId: 'c1', status: 'Accepted' }), // accepted (wins)
    ]);
    expect(map.c1).toBe('accepted');
  });

  it('keeps an earlier badge when a later same-campaign app has no badge', () => {
    // The undefined badge is skipped, so it does NOT clobber the earlier entry.
    const map = applicationStatusByCampaign([
      makeApp({ campaignId: 'c1', status: 'Accepted' }), // accepted
      makeApp({ campaignId: 'c1', status: 'Withdrawn' }), // no badge → skipped
    ]);
    expect(map.c1).toBe('accepted');
  });
});
