/**
 * Socket.io client singleton for real-time chat.
 *
 * Connects to the backend's HTTP origin (the REST `API_BASE_URL` minus its `/api`
 * suffix — Socket.io serves its own `/socket.io` path) and authenticates the
 * handshake with the access token from `lib/auth`. One shared socket backs the
 * whole app; `useChatSocket` (mounted once in the root layout) owns its lifecycle.
 */
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './env';
import { getAccessToken } from './auth';

/** Socket connects to the server root, not the `/api` REST prefix. */
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

/** Connect (or refresh the auth token on) the shared socket. No-op without a token. */
export function connectSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (socket) {
    // Reuse the existing socket; refresh auth in case the token rotated.
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });
  return socket;
}

/** The current socket, if connected. */
export function getSocket(): Socket | null {
  return socket;
}

/** Tear the socket down (sign-out). */
export function disconnectSocket(): void {
  if (!socket) return;
  // Don't `removeAllListeners()` — multiple consumers (chat + notifications)
  // share this singleton and each removes its own handlers in its effect
  // cleanup. Wiping them all here would strip a sibling's listener (e.g. the
  // notification celebration) mid-session. Disconnecting + nulling drops the
  // instance and its handlers; the next connectSocket() makes a fresh one.
  socket.disconnect();
  socket = null;
}
