/**
 * Centralized TanStack Query keys. One factory per resource keeps cache keys
 * consistent between the SSR prefetch (server) and the client hooks, and makes
 * targeted invalidation easy (`queryClient.invalidateQueries({ queryKey:
 * queryKeys.campaigns.lists() })`). Params are folded into the key so distinct
 * filter/sort combinations cache independently.
 */
import type {
  ApplicationListParams,
  CampaignListParams,
  MessageHistoryParams,
  PageParams,
} from './types';
import type { NotificationListParams } from './resources';

export const queryKeys = {
  campaigns: {
    all: ['campaigns'] as const,
    lists: () => [...queryKeys.campaigns.all, 'list'] as const,
    list: (params?: CampaignListParams) => [...queryKeys.campaigns.lists(), params ?? {}] as const,
    details: () => [...queryKeys.campaigns.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.campaigns.details(), id] as const,
  },

  applications: {
    all: ['applications'] as const,
    lists: () => [...queryKeys.applications.all, 'list'] as const,
    list: (params?: ApplicationListParams) =>
      [...queryKeys.applications.lists(), params ?? {}] as const,
    detail: (id: string) => [...queryKeys.applications.all, 'detail', id] as const,
  },

  profiles: {
    all: ['profiles'] as const,
    me: (role: 'creator' | 'business') => [...queryKeys.profiles.all, 'me', role] as const,
    creator: (id: string) => [...queryKeys.profiles.all, 'creator', id] as const,
    business: (id: string) => [...queryKeys.profiles.all, 'business', id] as const,
  },

  conversations: {
    all: ['conversations'] as const,
    list: (params?: PageParams) => [...queryKeys.conversations.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.conversations.all, 'detail', id] as const,
    messages: (id: string, params?: MessageHistoryParams) =>
      [...queryKeys.conversations.all, 'messages', id, params ?? {}] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (params?: NotificationListParams) =>
      [...queryKeys.notifications.all, 'list', params ?? {}] as const,
  },

  auth: {
    me: ['auth', 'me'] as const,
  },

  geocoding: {
    status: ['geocoding', 'status'] as const,
  },
} as const;
