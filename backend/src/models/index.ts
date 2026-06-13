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
export { Notification, type NotificationDoc } from './Notification';
export { Report, type ReportDoc } from './Report';
