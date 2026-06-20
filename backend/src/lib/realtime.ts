/**
 * Real-time transport (Socket.io) for chat. Attached to the same HTTP server the
 * REST API runs on. Responsibilities are deliberately narrow:
 *
 *   • authenticate each socket's handshake with the access-token JWT;
 *   • join every socket to its user's personal room (`user:<id>`);
 *   • relay low-stakes `typing` indicators between participants.
 *
 * Message persistence and read receipts go through the REST layer (one validated
 * write path); routes then fan messages out with `emitToUser`. Keeping writes off
 * the socket means we never duplicate auth/validation logic.
 *
 * Single-instance only for now. To scale horizontally, add `@socket.io/redis-adapter`
 * so `emitToUser` reaches sockets connected to other nodes.
 */
import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyToken } from './jwt';
import { corsOrigins } from './env';
import { User } from '../models/User';
import type { UserRole } from '../../../shared/constants/statuses';

interface SocketAuthData {
  userId: string;
  role: UserRole;
}

let io: SocketIOServer | null = null;

/** Personal room every one of a user's sockets joins, so we can target a user. */
const userRoom = (userId: string): string => `user:${userId}`;

/** Pull a bearer token out of an `Authorization` header, if present. */
function extractBearer(header?: string): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  return scheme === 'Bearer' && value ? value : undefined;
}

/** Attach a Socket.io server to the HTTP server and wire auth + handlers. */
export function initRealtime(httpServer: HttpServer): SocketIOServer {
  const origins = corsOrigins();
  const server = new SocketIOServer(httpServer, {
    // Mirror the REST CORS policy: no credentials with a wildcard reflect.
    cors: { origin: origins, credentials: origins !== true },
  });

  // Handshake auth — reuse the same access-token verification as REST, and reject
  // banned accounts (so a ban also cuts off realtime, matching the REST guard).
  server.use((socket, next) => {
    void (async () => {
      try {
        const token =
          (socket.handshake.auth?.token as string | undefined) ??
          extractBearer(socket.handshake.headers.authorization);
        if (!token) {
          next(new Error('unauthorized'));
          return;
        }
        const claims = verifyToken(token, 'access');
        const user = await User.findById(claims.sub).select('isBanned');
        if (!user || user.isBanned) {
          next(new Error('unauthorized'));
          return;
        }
        socket.data.userId = claims.sub;
        socket.data.role = claims.role;
        next();
      } catch {
        next(new Error('unauthorized'));
      }
    })();
  });

  server.on('connection', (socket) => {
    const { userId } = socket.data as SocketAuthData;
    void socket.join(userRoom(userId));

    // Typing relay. The client already knows the other participant's user id
    // (from the conversation), so no DB lookup is needed here.
    socket.on(
      'typing',
      (payload: { conversationId?: string; toUserId?: string; isTyping?: boolean }) => {
        if (!payload?.conversationId || !payload.toUserId) return;
        emitToUser(payload.toUserId, 'typing', {
          conversationId: payload.conversationId,
          fromUserId: userId,
          isTyping: Boolean(payload.isTyping),
        });
      },
    );
  });

  io = server;
  return server;
}

/** Emit an event to every socket of a given user. No-op if realtime is off. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

/** Whether the user currently has at least one connected socket. */
export function isUserOnline(userId: string): boolean {
  const room = io?.sockets.adapter.rooms.get(userRoom(userId));
  return !!room && room.size > 0;
}

/** Close the Socket.io server (graceful shutdown). */
export async function shutdownRealtime(): Promise<void> {
  if (!io) return;
  const server = io;
  io = null;
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
