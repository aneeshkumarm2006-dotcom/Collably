import type { ID, ISODateString, Timestamped } from './common';
import type { ApplicationStatus } from '../constants/statuses';

/**
 * A creator's application to a campaign, and the vehicle for the whole collab
 * lifecycle: pitch → accept/reject → submit proof → verify (PRD §5.5, §11).
 * One application per (campaignId, creatorId) pair — enforced by a unique
 * compound index on the backend (TODO Phase 3).
 */
export interface Application extends Timestamped {
  _id: ID;
  campaignId: ID; // ref: Campaign
  creatorId: ID; // ref: CreatorProfile
  businessId: ID; // ref: BusinessProfile
  pitch?: string;
  status: ApplicationStatus;

  // --- Submission (filled by creator after acceptance) ---
  submissionLink?: string;
  /** Screenshot/proof image URL (Cloudinary). */
  submissionProof?: string;
  submissionNote?: string;
  submittedAt?: ISODateString;

  // --- Verification (filled by business) ---
  verifiedAt?: ISODateString;
  verifiedBy?: ID; // userId of the verifying business user
  businessNote?: string;
}
