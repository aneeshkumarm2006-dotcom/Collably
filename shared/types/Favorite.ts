import type { ID, Timestamped } from './common';
import type { Campaign } from './Campaign';

/**
 * A creator's saved ("hearted") collab. Favouriting is private to the creator —
 * a business is never told who saved its campaign, and the count is not public.
 *
 * The list endpoint joins the campaign so the Saved screen can render cards
 * without an N+1 fetch; `campaign` is absent when the campaign was deleted.
 */
export interface Favorite extends Timestamped {
  _id: ID;
  /** The owning creator's **User** id. */
  creatorId: ID;
  campaignId: ID;
  campaign?: Campaign;
}
