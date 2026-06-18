/**
 * Chat conversation helpers shared by the application + conversation routes.
 *
 * A conversation is the chat thread for one accepted collab. Chat is between the
 * two *Users* (not their role profiles), so we resolve each profile's `userId`
 * here. Creation is idempotent (keyed by the unique `applicationId`) so a
 * re-approval or a race can't open two threads for the same collab.
 */
import { Conversation, type ConversationDoc } from '../models/Conversation';
import { Campaign } from '../models/Campaign';
import { BusinessProfile } from '../models/BusinessProfile';
import { CreatorProfile } from '../models/CreatorProfile';
import type { ApplicationDoc } from '../models/Application';

/**
 * Idempotently open (or fetch) the chat thread for an accepted application.
 * Returns `null` only if a participant profile can't be resolved — which
 * shouldn't happen for a genuine accepted collab.
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
    { applicationId: app._id },
    {
      $setOnInsert: {
        applicationId: app._id,
        campaignId: app.campaignId,
        campaignTitle: campaign?.title,
        businessId: app.businessId,
        creatorId: app.creatorId,
        businessUserId: business.userId,
        creatorUserId: creator.userId,
        participantUserIds: [business.userId, creator.userId],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}
