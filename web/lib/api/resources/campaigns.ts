/**
 * Campaign endpoints (PRD §11–§13). The discovery feed, CRUD, status machine,
 * and the creator "apply" action. Maps 1:1 to `backend/src/routes/campaigns.ts`.
 */
import type { CampaignStatus } from '@/lib/shared';
import type { HttpClient } from '../types';
import type {
  ApplyResponse,
  CampaignDeletedResponse,
  CampaignListParams,
  CampaignListResponse,
  CampaignResponse,
} from '../types';

/** A campaign create/update body (see `campaignCreateSchema` on the backend). */
export interface CampaignInput {
  title: string;
  description: string;
  category: string;
  isRemote?: boolean;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
    address?: string;
    placeId?: string;
  };
  reward: { type: string; description: string; estimatedValue?: number };
  deliverables?: Array<{
    platform: string;
    contentType: string;
    quantity?: number;
    requirements?: string;
  }>;
  deadline?: string;
  minFollowers?: number;
  tags?: string[];
  coverImage?: string | null;
}

export function createCampaignsApi(http: HttpClient) {
  return {
    /** GET /campaigns — discovery feed (filters, sort, pagination; guest-ok). */
    list: (params?: CampaignListParams, signal?: AbortSignal) =>
      http.get<CampaignListResponse>('/campaigns', {
        query: params as Record<string, unknown>,
        signal,
      }),

    /** GET /campaigns/:id — single campaign + business (guest-ok). */
    get: (id: string, signal?: AbortSignal) =>
      http.get<CampaignResponse>(`/campaigns/${id}`, { signal }),

    /** POST /campaigns — create (businessOnly). Pass `status: 'Active'` to publish. */
    create: (input: CampaignInput & { status?: 'Draft' | 'Active' }) =>
      http.post<CampaignResponse>('/campaigns', input),

    /** PUT /campaigns/:id — update an owned campaign. */
    update: (id: string, input: Partial<CampaignInput>) =>
      http.put<CampaignResponse>(`/campaigns/${id}`, input),

    /** DELETE /campaigns/:id — owner or admin; cascades applications. */
    remove: (id: string) => http.delete<CampaignDeletedResponse>(`/campaigns/${id}`),

    /** PATCH /campaigns/:id/status — drive the PRD §12 status machine. */
    setStatus: (id: string, status: CampaignStatus) =>
      http.patch<CampaignResponse>(`/campaigns/${id}/status`, { status }),

    /** POST /campaigns/:id/apply — creator applies (optional pitch). */
    apply: (id: string, pitch?: string) =>
      http.post<ApplyResponse>(`/campaigns/${id}/apply`, pitch ? { pitch } : {}),
  };
}

export type CampaignsApi = ReturnType<typeof createCampaignsApi>;
