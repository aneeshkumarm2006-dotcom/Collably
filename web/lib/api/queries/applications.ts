'use client';

/**
 * Application query hooks driving the creator (Phase 7) and business (Phase 8)
 * collab screens. Reads go through `clientApi` (the same-origin proxy); the
 * mutations invalidate the affected caches on success so lists, counts, and the
 * campaign detail re-resolve.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi } from '../client';
import { queryKeys } from '../query-keys';
import type { ApplicationListParams, SubmitContentInput, VerifyInput } from '../types';

/** A page of the caller's applications (creator = own, business = theirs). */
export function useApplications(params?: ApplicationListParams) {
  return useQuery({
    queryKey: queryKeys.applications.list(params),
    queryFn: ({ signal }) => clientApi.applications.list(params, signal),
  });
}

/** Infinite list of applications (used by the applications/collab screens). */
export function useInfiniteApplications(params?: Omit<ApplicationListParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.applications.list(params),
    queryFn: ({ pageParam, signal }) =>
      clientApi.applications.list({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

/** A single application + its joined campaign / creator / business. */
export function useApplication(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.applications.detail(id),
    queryFn: ({ signal }) => clientApi.applications.get(id, signal),
    enabled: enabled && Boolean(id),
  });
}

/** Creator withdraws a pending application; refresh the lists + that detail. */
export function useWithdrawApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientApi.applications.withdraw(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.applications.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.applications.detail(id) });
    },
  });
}

/** Creator submits content for an accepted collab; refresh lists + that detail. */
export function useSubmitContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SubmitContentInput }) =>
      clientApi.applications.submit(id, input),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.applications.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.applications.detail(id) });
    },
  });
}

/** Business decision (accept/reject) — used by Phase 8; invalidates the lists. */
export function useDecideApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      businessNote,
    }: {
      id: string;
      status: 'Accepted' | 'Rejected';
      businessNote?: string;
    }) => clientApi.applications.decide(id, status, businessNote),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.applications.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.applications.detail(id) });
    },
  });
}

/** Business nudges an accepted creator who hasn't submitted yet — used by Phase 8. */
export function useRemindCreator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientApi.applications.remind(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.applications.detail(id) });
    },
  });
}

/** Business verify / request-revision / fail — used by Phase 8. */
export function useVerifySubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VerifyInput }) =>
      clientApi.applications.verify(id, input),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.applications.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.applications.detail(id) });
    },
  });
}
