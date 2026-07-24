/**
 * Barrel export for external-integration services (PRD §17). Routes import from
 * here so the integration surface stays in one place:
 *
 *   import { createSignedUpload, notify, accountCreatedEmail } from '../services';
 *
 * - cloudinary: signed image-upload params (never exposes the API secret)
 * - resend:     transactional email transport + per-trigger templates (§9.2)
 * - expoPush:   Expo push transport + the unified `notify` dispatcher (§9.3)
 */
export {
  createSignedUpload,
  signParams,
  isCloudinaryConfigured,
  type SignUploadOptions,
  type SignedUploadParams,
  type UploadFolder,
} from './cloudinary';

export { sendSms, isTwilioConfigured, type SendSmsInput, type SendSmsResult } from './twilio';

export {
  isInstagramConfigured,
  extractInstagramHandle,
  verifyWebhookSignature,
  getInstagramProfile,
  sendInstagramDm,
  type InstagramProfile,
} from './instagram';

export {
  sendEmail,
  isResendConfigured,
  isGmailConfigured,
  isEmailConfigured,
  type EmailContent,
  type SendEmailInput,
  type SendEmailResult,
  accountCreatedEmail,
  passwordResetEmail,
  verificationCodeEmail,
  newApplicationEmail,
  applicationAcceptedEmail,
  applicationRejectedEmail,
  submissionReceivedEmail,
  submissionVerifiedEmail,
  revisionRequestedEmail,
  campaignExpiringEmail,
  newMatchingCampaignEmail,
} from './resend';

export {
  sendExpoPush,
  isExpoPushToken,
  notify,
  type ExpoPushMessage,
  type PushResult,
  type NotifyOptions,
  type NotifyResult,
  type NotificationPrefs,
} from './expoPush';

export {
  isGeocodingConfigured,
  forwardGeocode,
  reverseGeocode,
  type GeocodeResult,
} from './geocoding';
