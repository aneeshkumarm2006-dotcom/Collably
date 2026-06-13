/**
 * Notification store (Zustand). Holds the unread notification count that drives
 * the bell badge across the app (PRD §8.2, §15). The count is refreshed from
 * `GET /api/notifications` (which returns `unreadCount`) on app open and after
 * push receipts; screens can also adjust it optimistically.
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

type NotificationState = {
  unreadCount: number;
  /** Replace the count (e.g. from a notifications fetch). */
  setUnreadCount: (count: number) => void;
  /** Bump the count by `by` (default 1) — used on an incoming push. */
  increment: (by?: number) => void;
  /** Zero the count (after "mark all read"). */
  clear: () => void;
  /** Fetch the latest unread count from the backend. Best-effort. */
  refresh: () => Promise<void>;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),

  increment: (by = 1) => set((s) => ({ unreadCount: Math.max(0, s.unreadCount + by) })),

  clear: () => set({ unreadCount: 0 }),

  refresh: async () => {
    try {
      const { data } = await api.get<{ unreadCount: number }>('/notifications', {
        params: { unread: true },
      });
      set({ unreadCount: Math.max(0, data.unreadCount ?? 0) });
    } catch {
      // Non-fatal — leave the current count in place.
    }
  },
}));
