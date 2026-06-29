/**
 * Socket.io client singleton for real-time chat (Phase 9): the web counterpart
 * of `mobile/lib/socket.ts`. Connects to the backend's HTTP origin (`config.socketUrl`,
 * the REST base minus `/api`) and authenticates the handshake with the access
 * token. Because the JWT lives in an httpOnly cookie the browser can't read, the
 * token is fetched from the same-origin `/api/socket-token` route handler (which
 * also refreshes it when expired). `useDashboardRealtime` owns the lifecycle.
 */
import { io, type Socket } from 'socket.io-client';
import { config } from '@/lib/config';

let socket: Socket | null = null;

/** Fetch a fresh access token for the socket handshake (httpOnly cookie → server). */
export async function fetchSocketToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/socket-token', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string | null };
    return typeof data.token === 'string' ? data.token : null;
  } catch {
    return null;
  }
}

/** Connect (or refresh the auth token on) the shared socket. */
export function connectSocket(token: string): Socket {
  if (socket) {
    // Reuse the existing socket; refresh auth in case the token rotated.
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(config.socketUrl, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });
  return socket;
}

/** The current socket, if any. */
export function getSocket(): Socket | null {
  return socket;
}

/** Tear the socket down (sign-out / leaving the dashboard). */
export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
