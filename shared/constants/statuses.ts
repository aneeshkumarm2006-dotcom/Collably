/**
 * Roles + lifecycle statuses for users, campaigns, and applications,
 * plus the allowed campaign status transitions (PRD §5, §11, §12).
 */

// --- User roles (PRD §5.1, §6) ---
export const USER_ROLES = ['business', 'creator', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// --- Campaign statuses (PRD §5.4, §12) ---
export const CAMPAIGN_STATUSES = ['Draft', 'Active', 'Paused', 'Closed', 'Completed'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/**
 * Allowed campaign status transitions (PRD §12). Enforced server-side on
 * `PATCH /api/campaigns/:id/status`. A target not listed here is rejected.
 */
export const CAMPAIGN_STATUS_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  Draft: ['Active'],
  Active: ['Paused', 'Closed', 'Completed'],
  Paused: ['Active', 'Completed'],
  Closed: [],
  Completed: [],
};

export const canTransitionCampaign = (from: CampaignStatus, to: CampaignStatus): boolean =>
  CAMPAIGN_STATUS_TRANSITIONS[from].includes(to);

// --- Application statuses (PRD §5.5, §11; "Overdue" from §11 flow logic) ---
export const APPLICATION_STATUSES = [
  'Pending',
  'Accepted',
  'Rejected',
  'Withdrawn',
  'Completed',
  'Cancelled',
  'Overdue',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
