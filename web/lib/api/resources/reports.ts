/**
 * Report-filing endpoint (PRD §14): any signed-in user can report a campaign,
 * business, or creator into the admin moderation queue. Maps 1:1 to
 * `backend/src/routes/reports.ts`.
 */
import type { HttpClient } from '../types';
import type { FileReportInput, ReportResponse } from '../types';

export function createReportsApi(http: HttpClient) {
  return {
    /** POST /reports: file a moderation report. */
    file: (input: FileReportInput) => http.post<ReportResponse>('/reports', input),
  };
}

export type ReportsApi = ReturnType<typeof createReportsApi>;
