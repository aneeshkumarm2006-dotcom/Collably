/**
 * Content-moderation report kinds + statuses (PRD §7.5, §14). A report is filed
 * by one user against a campaign, business, or creator and lands in the admin
 * Reports tab for manual review.
 */

/** What a report targets. */
export const REPORT_TARGET_TYPES = ['campaign', 'business', 'creator', 'user'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

/** Review lifecycle of a report. */
export const REPORT_STATUSES = ['open', 'dismissed', 'actioned'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const isReportTargetType = (value: string): value is ReportTargetType =>
  (REPORT_TARGET_TYPES as readonly string[]).includes(value);
