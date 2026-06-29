'use client';

/**
 * Campaign query hooks: the reference pattern every list/detail screen follows
 * (Phases 6-8 add the rest the same way). Reads go through `clientApi` (the
 * same-origin proxy); keys come from `queryKeys`; the apply mutation invalidates
 * the affected caches on success.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { clientApi } from '../client';
import { queryKeys } from '../query-keys';
import type { CampaignListParams } from '../types';
import type { CampaignInput } from '../resources';
import type { CampaignStatus } from '@/lib/shared';

/** A single page of the discovery feed. */
export function useCampaigns(params?: CampaignListParams) {
  return useQuery({
    queryKey: queryKeys.campaigns.list(params),
    queryFn: ({ signal }) => clientApi.campaigns.list(params, signal),
  });
}

/** Infinite-scroll discovery feed: pages until `totalPages` is reached. */
export function useInfiniteCampaigns(params?: Omit<CampaignListParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.campaigns.list(params),
    queryFn: ({ pageParam, signal }) =>
      clientApi.campaigns.list({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

/** A single campaign + its business. */
export function useCampaign(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.campaigns.detail(id),
    queryFn: ({ signal }) => clientApi.campaigns.get(id, signal),
    enabled: enabled && Boolean(id),
  });
}

/** Apply to a campaign; refresh the campaign detail + the creator's applications. */
export function useApplyToCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pitch }: { id: string; pitch?: string }) =>
      clientApi.campaigns.apply(id, pitch),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.campaigns.detail(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.applications.lists() });
    },
  });
}

/** Business creates a campaign (Draft or Active); refresh the "my campaigns" lists. */
export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignInput & { status?: 'Draft' | 'Active' }) =>
      clientApi.campaigns.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
    },
  });
}

/** Business edits an owned campaign; refresh the lists + that detail. */
export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CampaignInput> }) =>
      clientApi.campaigns.update(id, input),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.campaigns.detail(id) });
    },
  });
}

/** Drive the campaign status machine (Publish/Pause/Resume/Close/Complete). */
export function useSetCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      clientApi.campaigns.setStatus(id, status),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.campaigns.detail(id) });
    },
  });
}

/** Delete an owned campaign (cascades its applications); refresh the lists. */
export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientApi.campaigns.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.applications.lists() });
    },
  });
}
