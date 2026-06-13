import type { ID, ISODateString, Timestamped } from './common';
import type { ReportTargetType, ReportStatus } from '../constants/reports';

/**
 * A user-filed moderation report (PRD §7.5, §14). Reviewed by admins, who then
 * dismiss it or act (suspend/ban/force-close the target).
 */
export interface Report extends Timestamped {
  _id: ID;
  reporterId: ID; // ref: User
  targetType: ReportTargetType;
  targetId: ID; // ref into the matching collection (Campaign / *Profile / User)
  reason: string;
  status: ReportStatus;
  /** Admin user who resolved the report, set when status leaves "open". */
  resolvedBy?: ID | null;
  resolvedAt?: ISODateString | null;
}
