/**
 * Map a creator's applications onto the campaign-card corner badge ('applied' /
 * 'accepted' / 'rejected'), so the authed Explore + niche rail can flag campaigns
 * the creator has already engaged with.
 */
import type { ApplicationStatus } from '@/lib/shared';
import type { PublicApplication } from '@/lib/api/types';

export type CardAppStatus = 'applied' | 'accepted' | 'rejected';

/** Application lifecycle status → the card overlay badge (or none). */
export function cardApplicationStatus(status: ApplicationStatus): CardAppStatus | undefined {
  switch (status) {
    case 'Pending':
      return 'applied';
    case 'Accepted':
    case 'Overdue':
    case 'Completed':
      return 'accepted';
    case 'Rejected':
    case 'Cancelled':
      return 'rejected';
    default:
      return undefined; // Withdrawn → no badge
  }
}

/** Build a `{ campaignId → badge }` map from the creator's applications. */
export function applicationStatusByCampaign(
  apps: PublicApplication[],
): Record<string, CardAppStatus> {
  const map: Record<string, CardAppStatus> = {};
  for (const a of apps) {
    const badge = cardApplicationStatus(a.status);
    if (badge) map[a.campaignId] = badge;
  }
  return map;
}
