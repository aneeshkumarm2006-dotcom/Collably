import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import {
  REPORT_TARGET_TYPES,
  REPORT_STATUSES,
  type ReportTargetType,
  type ReportStatus,
} from '../../../shared/constants/reports';

/**
 * A user-filed moderation report (PRD §7.5, §14). Reporters flag a campaign,
 * business, or creator; reports surface in the admin Reports tab where an admin
 * dismisses or acts on them. `targetId` points into whichever collection
 * `targetType` names — it isn't a single `ref`, so it's resolved per type.
 */
export interface ReportDoc extends Document<Types.ObjectId> {
  reporterId: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  reason: string;
  status: ReportStatus;
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<ReportDoc>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: [...REPORT_TARGET_TYPES], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: [...REPORT_STATUSES], default: 'open', index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Admin Reports tab lists open reports newest-first (PRD §7.5).
reportSchema.index({ status: 1, createdAt: -1 });

export const Report: Model<ReportDoc> =
  (models.Report as Model<ReportDoc>) || model<ReportDoc>('Report', reportSchema);
