/**
 * Resource factory. `createResources(http)` binds every typed resource module to
 * one transport, so a Server Component does `serverApi.campaigns.list(...)` and a
 * client hook does `clientApi.campaigns.list(...)` from the exact same
 * definitions. The two transports (server cookie→Bearer, client same-origin
 * proxy) only differ in how requests leave the machine.
 */
import type { HttpClient } from '../types';
import { createAuthApi } from './auth';
import { createCampaignsApi } from './campaigns';
import { createApplicationsApi } from './applications';
import { createProfilesApi } from './profiles';
import { createConversationsApi } from './conversations';
import { createNotificationsApi } from './notifications';
import { createUploadApi } from './upload';
import { createGeocodingApi } from './geocoding';
import { createReportsApi } from './reports';

export function createResources(http: HttpClient) {
  return {
    auth: createAuthApi(http),
    campaigns: createCampaignsApi(http),
    applications: createApplicationsApi(http),
    profiles: createProfilesApi(http),
    conversations: createConversationsApi(http),
    notifications: createNotificationsApi(http),
    upload: createUploadApi(http),
    geocoding: createGeocodingApi(http),
    reports: createReportsApi(http),
  };
}

export type Resources = ReturnType<typeof createResources>;

export type { CampaignInput } from './campaigns';
export type { BusinessProfileInput, CreatorProfileInput } from './profiles';
export type { NotificationListParams } from './notifications';
export type { RegisterInput, LoginInput } from './auth';
