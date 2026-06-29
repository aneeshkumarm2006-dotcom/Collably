/**
 * Notification endpoints (PRD §9.3) — the in-app feed (+ unread count) and a
 * "mark all read" action. Maps 1:1 to `backend/src/routes/notifications.ts`.
 */
import type { HttpClient } from '../types';
import type { NotificationListResponse, NotificationsReadResponse, PageParams } from '../types';

export interface NotificationListParams extends PageParams {
  unread?: boolean;
}

export function createNotificationsApi(http: HttpClient) {
  return {
    /** GET /notifications — newest-first feed with an unread count. */
    list: (params?: NotificationListParams, signal?: AbortSignal) =>
      http.get<NotificationListResponse>('/notifications', {
        query: params as Record<string, unknown>,
        signal,
      }),

    /** PATCH /notifications/read — mark every notification read. */
    markAllRead: () => http.patch<NotificationsReadResponse>('/notifications/read'),
  };
}

export type NotificationsApi = ReturnType<typeof createNotificationsApi>;
