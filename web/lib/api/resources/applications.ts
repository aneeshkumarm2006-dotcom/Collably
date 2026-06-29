/**
 * Application endpoints (PRD §11) — the collab lifecycle after "apply": list,
 * accept/reject, submit, remind, withdraw, verify. Maps 1:1 to
 * `backend/src/routes/applications.ts`.
 */
import type { HttpClient } from '../types';
import type {
  ApplicationListParams,
  ApplicationListResponse,
  ApplicationResponse,
  SubmitContentInput,
  VerifyInput,
} from '../types';

export function createApplicationsApi(http: HttpClient) {
  return {
    /** GET /applications — role-scoped list (creator=own, business=theirs). */
    list: (params?: ApplicationListParams, signal?: AbortSignal) =>
      http.get<ApplicationListResponse>('/applications', {
        query: params as Record<string, unknown>,
        signal,
      }),

    /** GET /applications/:id — single (participants + admin only). */
    get: (id: string, signal?: AbortSignal) =>
      http.get<ApplicationResponse>(`/applications/${id}`, { signal }),

    /** PATCH /applications/:id — business accepts or rejects (with optional note). */
    decide: (id: string, status: 'Accepted' | 'Rejected', businessNote?: string) =>
      http.patch<ApplicationResponse>(`/applications/${id}`, { status, businessNote }),

    /** POST /applications/:id/submit — creator submits content. */
    submit: (id: string, input: SubmitContentInput) =>
      http.post<ApplicationResponse>(`/applications/${id}/submit`, input),

    /** POST /applications/:id/remind — business nudges a creator who hasn't submitted. */
    remind: (id: string) => http.post<{ reminded: true }>(`/applications/${id}/remind`),

    /** POST /applications/:id/withdraw — creator withdraws a pending application. */
    withdraw: (id: string) => http.post<ApplicationResponse>(`/applications/${id}/withdraw`),

    /** PATCH /applications/:id/verify — business verifies / requests revision / fails. */
    verify: (id: string, input: VerifyInput) =>
      http.patch<ApplicationResponse>(`/applications/${id}/verify`, input),
  };
}

export type ApplicationsApi = ReturnType<typeof createApplicationsApi>;
