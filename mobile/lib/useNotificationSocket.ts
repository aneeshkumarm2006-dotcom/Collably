/**
 * Real-time notification wiring (mounted once in the root layout, alongside
 * {@link useChatSocket} and {@link usePushNotifications}). Listens for the
 * `notification:new` event the backend emits from `notify()` on every §9.2
 * trigger, so the bell badge ticks live — no manual refresh — while the app is
 * open. Approval/verification events additionally fire the celebratory popup.
 */
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { CELEBRATION_TYPES, celebrateForNotification, replayMissedCelebration } from './celebration';
import { connectSocket } from './socket';

// The backend emits the full serialized notification under `notification`
// (see `notify()` in backend/src/services/expoPush.ts).
type IncomingNotification = {
  notification?: {
    _id?: string;
    type?: string;
    message?: string;
    deepLinkPath?: string;
  };
};

export function useNotificationSocket(ready: boolean): void {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (!ready || status !== 'authenticated') return;

    // Catch up on a verification approved while we were disconnected — Socket.io
    // doesn't queue events for offline clients, so the live path below can miss it.
    void replayMissedCelebration();

    const socket = connectSocket();
    if (!socket) return;

    const onNotification = (payload: IncomingNotification) => {
      // Keep the bell badge accurate against the server rather than guessing.
      void useNotificationStore.getState().refresh();

      const n = payload?.notification;
      if (n?.type && CELEBRATION_TYPES.has(n.type)) {
        void celebrateForNotification(n._id, n.message);
      }
    };

    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
  }, [ready, status]);
}
