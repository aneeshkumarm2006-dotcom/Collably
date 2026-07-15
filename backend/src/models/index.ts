/**
 * Barrel export for all Mongoose models (PRD §5). Import models from here:
 *
 *   import { User, Campaign, Application } from '../models';
 *
 * Importing this module registers every schema on the shared Mongoose
 * connection, so `ref` population works regardless of import order.
 */
export { User, type UserDoc } from './User';
export { BusinessProfile, type BusinessProfileDoc } from './BusinessProfile';
export { CreatorProfile, type CreatorProfileDoc } from './CreatorProfile';
export { Campaign, type CampaignDoc } from './Campaign';
export { Application, type ApplicationDoc } from './Application';
export { Favorite, type FavoriteDoc } from './Favorite';
export { VerificationCode, type VerificationCodeDoc, type VerificationChannel } from './VerificationCode';
export {
  InstagramVerification,
  type InstagramVerificationDoc,
  type InstagramVerificationStatus,
} from './InstagramVerification';
export { Conversation, type ConversationDoc } from './Conversation';
export { Message, type MessageDoc } from './Message';
export { Notification, type NotificationDoc } from './Notification';
export { Report, type ReportDoc } from './Report';
