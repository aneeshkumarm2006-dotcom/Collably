import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../../../shared/constants/statuses';

/**
 * A creator's application to a campaign — the vehicle for the whole collab
 * lifecycle: pitch → accept/reject → submit proof → verify (PRD §5.5, §11).
 * A unique compound index on (campaignId, creatorId) enforces the
 * "one application per campaign" rule from PRD §11.
 */
export interface ApplicationDoc extends Document<Types.ObjectId> {
  campaignId: Types.ObjectId;
  creatorId: Types.ObjectId;
  businessId: Types.ObjectId;
  pitch?: string;
  status: ApplicationStatus;
  submissionLink?: string;
  submissionProof?: string;
  submissionNote?: string;
  submittedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  businessNote?: string;
  /** Chat thread for this collab — set when the application is accepted. */
  conversationId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<ApplicationDoc>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'CreatorProfile', required: true, index: true },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    pitch: { type: String, trim: true },
    status: { type: String, enum: [...APPLICATION_STATUSES], default: 'Pending', index: true },

    // Submission (filled by the creator after acceptance).
    submissionLink: { type: String, trim: true },
    submissionProof: { type: String, trim: true },
    submissionNote: { type: String, trim: true },
    submittedAt: { type: Date },

    // Verification (filled by the business).
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    businessNote: { type: String, trim: true },

    // Chat: the conversation opened when this application is accepted.
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  },
  { timestamps: true },
);

// One application per (campaign, creator) — enforces PRD §11 "apply once".
applicationSchema.index({ campaignId: 1, creatorId: 1 }, { unique: true });

export const Application: Model<ApplicationDoc> =
  (models.Application as Model<ApplicationDoc>) ||
  model<ApplicationDoc>('Application', applicationSchema);
