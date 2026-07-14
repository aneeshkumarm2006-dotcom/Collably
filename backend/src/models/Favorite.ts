import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/**
 * A creator's saved ("hearted") collab. Private to the creator: businesses are
 * never shown who saved their campaign, so there is no public save count.
 *
 * `creatorId` is the **User** id (not the CreatorProfile id) — the heart is toggled
 * straight from the feed, where only the signed-in user is in hand, and this keeps
 * the toggle a single write with no profile lookup.
 */
export interface FavoriteDoc extends Document<Types.ObjectId> {
  creatorId: Types.ObjectId;
  campaignId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<FavoriteDoc>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
  },
  { timestamps: true },
);

// One row per (creator, campaign): makes the toggle idempotent and lets a repeat
// save fail fast at the DB rather than silently duplicating.
favoriteSchema.index({ creatorId: 1, campaignId: 1 }, { unique: true });

// The Saved list reads newest-first for one creator.
favoriteSchema.index({ creatorId: 1, createdAt: -1 });

export const Favorite: Model<FavoriteDoc> =
  (models.Favorite as Model<FavoriteDoc>) || model<FavoriteDoc>('Favorite', favoriteSchema);
