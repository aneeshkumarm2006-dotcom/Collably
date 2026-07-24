/**
 * Chat routes — the conversation + message surface for an accepted collab.
 * A conversation is opened when a business approves a creator (see the accept
 * handler in `applications.ts`); these endpoints list threads, page message
 * history, send a message, and mark a thread read. Sending persists the message
 * then fans it out over Socket.io (`lib/realtime`) so both participants see it in
 * real time; an offline recipient also gets a push + in-app notification.
 *
 *   GET  /api/conversations              my threads, newest activity first
 *   GET  /api/conversations/:id          one thread (participant only)
 *   GET  /api/conversations/:id/messages cursor history (`?before=&limit=`)
 *   POST /api/conversations/:id/messages send a message
 *   POST /api/conversations/:id/read     mark the thread read
 */
import { Router } from 'express';
import { z } from 'zod';
import type { FilterQuery } from 'mongoose';
import { Conversation, type ConversationDoc } from '../models/Conversation';
import { Message, type MessageDoc } from '../models/Message';
import { BusinessProfile } from '../models/BusinessProfile';
import { User } from '../models/User';
import { areBlocked } from '../models/Block';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { objectIdParam, parsePagination, paginated } from '../lib/http';
import { toPublicConversation, toPublicMessage } from '../lib/serialize';
import { emitToUser, isUserOnline } from '../lib/realtime';
import { notify } from '../services';
import type { UserSummary } from '../../../shared/types/User';

const router = Router();

// --- Validation ---------------------------------------------------------------

const historyQuerySchema = z.object({
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(50).catch(30).default(30),
});

const sendSchema = z.object({
  body: z.string().trim().min(1, 'message is required').max(4000),
});

// --- Helpers ------------------------------------------------------------------

async function findConversationOr404(id: string): Promise<ConversationDoc> {
  const c = await Conversation.findById(id);
  if (!c) throw new AppError(404, 'Conversation not found');
  return c;
}

/** Throw 403 unless the caller is one of the two participants. */
function assertParticipant(c: ConversationDoc, req: Express.Request): void {
  const uid = req.user!._id.toString();
  if (!c.participantUserIds.some((p) => p.toString() === uid)) {
    throw new AppError(403, 'You are not part of this conversation');
  }
}

/**
 * Build the "other participant" chip for a viewer. A business shows as its
 * `businessName`/`logo`; a creator shows as their User `name`/`avatar`.
 */
async function resolveOtherParticipant(
  c: ConversationDoc,
  viewerUserId: string,
): Promise<UserSummary> {
  const viewerIsCreator = c.creatorUserId.toString() === viewerUserId;
  if (viewerIsCreator) {
    const biz = await BusinessProfile.findById(c.businessId).select('businessName logo');
    return {
      _id: c.businessUserId.toString(),
      name: biz?.businessName ?? 'Business',
      avatar: biz?.logo ?? null,
      role: 'business',
      createdAt: c.createdAt.toISOString(),
    };
  }
  const user = await User.findById(c.creatorUserId).select('name avatar');
  return {
    _id: c.creatorUserId.toString(),
    name: user?.name ?? 'Creator',
    avatar: user?.avatar ?? null,
    role: 'creator',
    createdAt: c.createdAt.toISOString(),
  };
}

// --- Routes -------------------------------------------------------------------

/** GET /api/conversations — the caller's threads, newest activity first. */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const filter: FilterQuery<ConversationDoc> = { participantUserIds: req.user!._id };
    const total = await Conversation.countDocuments(filter);
    const convos = await Conversation.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit);

    const viewerId = req.user!._id.toString();
    const items = await Promise.all(
      convos.map(async (c) =>
        toPublicConversation(c, viewerId, await resolveOtherParticipant(c, viewerId)),
      ),
    );
    res.status(200).json(paginated(items, total, pagination));
  }),
);

/** GET /api/conversations/:id — one thread (participant only). */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const c = await findConversationOr404(id);
    assertParticipant(c, req);
    const viewerId = req.user!._id.toString();
    res.status(200).json({
      conversation: toPublicConversation(c, viewerId, await resolveOtherParticipant(c, viewerId)),
    });
  }),
);

/** GET /api/conversations/:id/messages — newest-first cursor history. */
router.get(
  '/:id/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const c = await findConversationOr404(id);
    assertParticipant(c, req);
    const { before, limit } = historyQuerySchema.parse(req.query);

    const q: FilterQuery<MessageDoc> = { conversationId: c._id };
    if (before) q.createdAt = { $lt: before };
    const docs = await Message.find(q).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({ messages: docs.map(toPublicMessage) });
  }),
);

/** POST /api/conversations/:id/messages — send a message. */
router.post(
  '/:id/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const c = await findConversationOr404(id);
    assertParticipant(c, req);
    const { body } = sendSchema.parse(req.body);

    const senderUserId = req.user!._id;
    const senderIsBusiness = c.businessUserId.toString() === senderUserId.toString();
    const recipientUserId = senderIsBusiness ? c.creatorUserId : c.businessUserId;

    // A block cuts contact both ways (App Store 1.2 / Play UGC). Checked here at
    // the send rather than at thread open so an existing thread stays readable —
    // history doesn't vanish, it just goes read-only for both sides.
    if (await areBlocked(senderUserId, recipientUserId)) {
      throw new AppError(403, 'You can no longer message this account.');
    }

    // If the recipient is connected, the message:new below reaches their device
    // now → it's delivered (WhatsApp ✓✓ grey). Otherwise it stays "sent" (✓) until
    // they reconnect (see the delivery catch-up in lib/realtime on socket connect).
    const recipientOnline = isUserOnline(recipientUserId.toString());
    const message = await Message.create({
      conversationId: c._id,
      senderUserId,
      senderRole: req.user!.role,
      body,
      ...(recipientOnline ? { deliveredAt: new Date() } : {}),
    });

    // Update the thread preview + bump the recipient's unread counter.
    c.lastMessage = body;
    c.lastMessageAt = message.createdAt;
    c.lastSenderUserId = senderUserId;
    if (senderIsBusiness) c.unreadByCreator += 1;
    else c.unreadByBusiness += 1;
    await c.save();

    const publicMessage = toPublicMessage(message);
    // Real-time fan-out to both participants (sender echo reconciles optimistic UI).
    emitToUser(c.businessUserId.toString(), 'message:new', {
      conversationId: c.id,
      message: publicMessage,
    });
    emitToUser(c.creatorUserId.toString(), 'message:new', {
      conversationId: c.id,
      message: publicMessage,
    });

    // Notify the recipient if they aren't actively connected (avoids push spam
    // while they're already in the thread). Best-effort — never blocks the send.
    if (!isUserOnline(recipientUserId.toString())) {
      try {
        const preview = body.length > 80 ? `${body.slice(0, 79)}…` : body;
        await notify({
          recipient: recipientUserId.toString(),
          type: 'new_message',
          message: `${req.user!.name}: ${preview}`,
          deepLinkPath: `/chat/${c.id}`,
        });
      } catch (err) {
        console.error(
          '[conversations] message notify error:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    res.status(201).json({ message: publicMessage });
  }),
);

/** POST /api/conversations/:id/read — mark the thread read for the caller. */
router.post(
  '/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = objectIdParam(req.params.id);
    const c = await findConversationOr404(id);
    assertParticipant(c, req);
    const viewerId = req.user!._id.toString();
    const viewerIsBusiness = c.businessUserId.toString() === viewerId;

    // Stamp the other side's unread messages as read, and zero my counter.
    await Message.updateMany(
      { conversationId: c._id, senderUserId: { $ne: req.user!._id }, readAt: { $exists: false } },
      { $set: { readAt: new Date() } },
    );
    if (viewerIsBusiness) c.unreadByBusiness = 0;
    else c.unreadByCreator = 0;
    await c.save();

    // Let the other participant update read receipts live.
    const otherUserId = viewerIsBusiness ? c.creatorUserId : c.businessUserId;
    emitToUser(otherUserId.toString(), 'conversation:read', {
      conversationId: c.id,
      byUserId: viewerId,
    });

    res.status(200).json({
      conversation: toPublicConversation(c, viewerId, await resolveOtherParticipant(c, viewerId)),
    });
  }),
);

export default router;
