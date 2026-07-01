/**
 * Barrel for the client query hooks. Import screen data hooks from here:
 *
 *   import { useInfiniteCampaigns, useNotifications } from '@/lib/api/queries';
 *
 * (The server-only `prefetchQueries` helper lives in `./prefetch` and must be
 * imported directly from a Server Component, not through this client barrel.)
 */
export * from './campaigns';
export * from './applications';
export * from './conversations';
export * from './notifications';
