/**
 * Chat conversation helpers shared by the application + conversation routes.
 *
 * A conversation is the chat thread between a business and a creator. Chat is between
 * the two *Users* (not their role profiles), so we resolve each profile's `userId`
 * here. Creation is idempotent (keyed by the unique user pair) so a re-approval, a
 * second collab, or a race can't open a duplicate thread.
 */
import { randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import { Conversation, type ConversationDoc } from '../models/Conversation';
import { Campaign } from '../models/Campaign';
import { BusinessProfile } from '../models/BusinessProfile';
import { CreatorProfile } from '../models/CreatorProfile';
import { User, type UserDoc } from '../models/User';
import type { ApplicationDoc } from '../models/Application';

/** Fixed identity the creator sees on the support side of an admin thread. */
export const SUPPORT_EMAIL = 'support@localcreatorcrew.com';
export const SUPPORT_NAME = 'Local Creator Crew';

/**
 * Idempotently open (or fetch) the chat thread between the business and the creator
 * on an accepted application. Returns `null` only if a participant profile can't be
 * resolved — which shouldn't happen for a genuine accepted collab.
 *
 * ONE thread per business↔creator pair. A second (third, tenth) accepted collab with
 * the same business reuses the same thread rather than opening another one, so the
 * chat list shows a business once instead of once per contract.
 *
 * The collab fields are `$set` rather than `$setOnInsert` on purpose: on an existing
 * thread they're overwritten with the newest collab, which is what keeps the
 * "Collab · <title>" context strip pointing at what the two are currently working on.
 * The participants are `$setOnInsert` because they define the thread's identity and
 * must never move.
 */
export async function getOrCreateConversationForApplication(
  app: ApplicationDoc,
): Promise<ConversationDoc | null> {
  const [business, creator, campaign] = await Promise.all([
    BusinessProfile.findById(app.businessId).select('userId'),
    CreatorProfile.findById(app.creatorId).select('userId'),
    Campaign.findById(app.campaignId).select('title'),
  ]);
  if (!business || !creator) return null;

  return Conversation.findOneAndUpdate(
    { kind: 'application', businessUserId: business.userId, creatorUserId: creator.userId },
    {
      // Latest-collab context, refreshed on every accept.
      $set: {
        applicationId: app._id,
        campaignId: app.campaignId,
        campaignTitle: campaign?.title,
        businessId: app.businessId,
        creatorId: app.creatorId,
      },
      // Thread identity — set once, never touched again.
      $setOnInsert: {
        kind: 'application',
        businessUserId: business.userId,
        creatorUserId: creator.userId,
        participantUserIds: [business.userId, creator.userId],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

/**
 * The single "other participant" the creator sees on the support side of an admin
 * thread. Find-or-create a lone admin User keyed by a fixed support email. It can
 * never sign in with a password (we set an unusable random hash) and links no
 * Google/Apple account, so it's purely an internal identity for support chat.
 * Idempotent via an upsert on the unique email.
 */
export async function getOrCreateSupportUser(): Promise<UserDoc> {
  const user = await User.findOneAndUpdate(
    { email: SUPPORT_EMAIL },
    {
      $setOnInsert: {
        email: SUPPORT_EMAIL,
        name: SUPPORT_NAME,
        role: 'admin',
        // Unusable, unknowable secret: satisfies the schema without ever being a
        // real login credential (there is no way to derive a password from it).
        passwordHash: `disabled:${randomBytes(32).toString('hex')}`,
        isVerified: true,
        isOnboarded: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  // findOneAndUpdate with upsert always returns a doc here; assert for the type.
  return user as UserDoc;
}

/**
 * Idempotently open (or fetch) the ADMIN support thread for one MEMBER — a creator
 * OR a business owner (identified by their User id). Keyed by
 * `{ kind:'admin', creatorUserId }` (unique partial index) so concurrent opens
 * can't fork the thread; `creatorUserId` is the generic "member" seat here (user
 * ids never collide across roles). The support user occupies the "business" seat
 * (`businessUserId`) so the existing dyad plumbing — unread columns, recipient
 * resolution, serializer — resolves it as the other side without special-casing
 * whether the member is a creator or a business.
 */
export async function getOrCreateAdminConversation(
  memberUserId: Types.ObjectId | string,
): Promise<ConversationDoc> {
  const support = await getOrCreateSupportUser();
  const supportUserId = support._id;

  const convo = await Conversation.findOneAndUpdate(
    { kind: 'admin', creatorUserId: memberUserId },
    {
      $setOnInsert: {
        kind: 'admin',
        creatorUserId: memberUserId,
        businessUserId: supportUserId,
        participantUserIds: [supportUserId, memberUserId],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return convo as ConversationDoc;
}

/**
 * The user id of the participant that isn't `userId`. For every current thread
 * (business<->creator or support<->creator) there are exactly two participants,
 * so this returns the single counterpart. Returns null if `userId` isn't a
 * participant (fail-closed callers treat that as "no recipient").
 */
export function otherParticipantUserId(
  c: Pick<ConversationDoc, 'participantUserIds'>,
  userId: string,
): string | null {
  const other = c.participantUserIds.find((p) => p.toString() !== userId);
  return other ? other.toString() : null;
}
