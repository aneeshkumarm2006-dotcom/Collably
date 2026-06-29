/**
 * Notification triggers (PRD §9.2) — thin orchestration the route handlers call
 * after a state change. Each helper bundles the in-app Notification, push, and
 * email for one trigger and delegates to `notify` (the unified dispatcher in
 * `services/expoPush`). The recipient is given as a User id; `notify` loads it.
 *
 * Triggers are **best-effort and never throw**: the core flow (accept, submit,
 * verify…) has already committed by the time we notify, so a downed push/email
 * provider — or even a missing recipient — must not turn a successful mutation
 * into a 500. Failures are swallowed and logged.
 *
 * `deepLinkPath` is the in-app route a tap navigates to (PRD §8.2). Paths are
 * kept human-readable and stable so the mobile router (Phase 9+) can map them.
 */
import {
  notify,
  newApplicationEmail,
  applicationAcceptedEmail,
  applicationRejectedEmail,
  submissionReceivedEmail,
  submissionVerifiedEmail,
  revisionRequestedEmail,
} from '../services';

/** Run a trigger without ever letting it bubble — log and move on. */
async function safeNotify(label: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (err) {
    console.error(`[triggers] ${label} failed:`, err instanceof Error ? err.message : err);
  }
}

/** New application received → business (push + email). */
export function notifyNewApplication(opts: {
  businessUserId: string;
  businessName: string;
  creatorName: string;
  campaignId: string;
  campaignTitle: string;
}): Promise<void> {
  return safeNotify('new_application', () =>
    notify({
      recipient: opts.businessUserId,
      type: 'new_application',
      message: `${opts.creatorName} applied to "${opts.campaignTitle}".`,
      deepLinkPath: `/campaigns/${opts.campaignId}/applications`,
      email: newApplicationEmail({
        businessName: opts.businessName,
        creatorName: opts.creatorName,
        campaignTitle: opts.campaignTitle,
      }),
    }),
  );
}

/** Application accepted → creator (push + email). */
export function notifyApplicationAccepted(opts: {
  creatorUserId: string;
  creatorName: string;
  businessName: string;
  applicationId: string;
  campaignTitle: string;
}): Promise<void> {
  return safeNotify('application_accepted', () =>
    notify({
      recipient: opts.creatorUserId,
      type: 'application_accepted',
      message: `You're in! ${opts.businessName} accepted you for "${opts.campaignTitle}".`,
      deepLinkPath: `/applications/${opts.applicationId}`,
      email: applicationAcceptedEmail({
        creatorName: opts.creatorName,
        campaignTitle: opts.campaignTitle,
        businessName: opts.businessName,
      }),
    }),
  );
}

/** Application rejected → creator (push + email). */
export function notifyApplicationRejected(opts: {
  creatorUserId: string;
  creatorName: string;
  applicationId: string;
  campaignTitle: string;
}): Promise<void> {
  return safeNotify('application_rejected', () =>
    notify({
      recipient: opts.creatorUserId,
      type: 'application_rejected',
      message: `Your application to "${opts.campaignTitle}" wasn't selected this time.`,
      deepLinkPath: `/applications/${opts.applicationId}`,
      email: applicationRejectedEmail({
        creatorName: opts.creatorName,
        campaignTitle: opts.campaignTitle,
      }),
    }),
  );
}

/** Creator submitted content → business (push + email). */
export function notifySubmissionReceived(opts: {
  businessUserId: string;
  creatorName: string;
  applicationId: string;
  campaignTitle: string;
}): Promise<void> {
  return safeNotify('submission_received', () =>
    notify({
      recipient: opts.businessUserId,
      type: 'submission_received',
      message: `${opts.creatorName} submitted content for "${opts.campaignTitle}".`,
      deepLinkPath: `/submissions?applicationId=${opts.applicationId}`,
      email: submissionReceivedEmail({
        creatorName: opts.creatorName,
        campaignTitle: opts.campaignTitle,
      }),
    }),
  );
}

/** Submission verified → creator (push + email). */
export function notifySubmissionVerified(opts: {
  creatorUserId: string;
  creatorName: string;
  applicationId: string;
  campaignTitle: string;
}): Promise<void> {
  return safeNotify('submission_verified', () =>
    notify({
      recipient: opts.creatorUserId,
      type: 'submission_verified',
      message: `Your collab "${opts.campaignTitle}" is complete! Reward confirmed.`,
      deepLinkPath: `/collabs/${opts.applicationId}`,
      email: submissionVerifiedEmail({
        creatorName: opts.creatorName,
        campaignTitle: opts.campaignTitle,
      }),
    }),
  );
}

/**
 * Creator verified by an admin → creator (push + in-app). The mobile app turns
 * this type into the celebratory "you're verified" moment, so the copy is upbeat.
 * No email template yet — push + in-app cover the §9.2 channels for now.
 */
export function notifyCreatorVerified(opts: {
  creatorUserId: string;
  creatorName?: string;
}): Promise<void> {
  const who = opts.creatorName ? `, ${opts.creatorName}` : '';
  return safeNotify('creator_verified', () =>
    notify({
      recipient: opts.creatorUserId,
      type: 'creator_verified',
      message: `You're verified${who}! Your creator profile is live — you can now apply to campaigns.`,
      deepLinkPath: '/notifications',
      push: { title: "You're verified! 🎉", body: 'Your creator profile is live. Start applying to campaigns.' },
    }),
  );
}

/**
 * Business verified by an admin → business (push + in-app). Mirrors
 * {@link notifyCreatorVerified}; unlocks publishing campaigns.
 */
export function notifyBusinessVerified(opts: {
  businessUserId: string;
  businessName?: string;
}): Promise<void> {
  const who = opts.businessName ? `, ${opts.businessName}` : '';
  return safeNotify('business_verified', () =>
    notify({
      recipient: opts.businessUserId,
      type: 'business_verified',
      message: `You're verified${who}! You can now publish campaigns and start collaborating with creators.`,
      deepLinkPath: '/notifications',
      push: { title: "You're verified! 🎉", body: 'You can now publish campaigns and find creators.' },
    }),
  );
}

/** Revision requested → creator (push + email). */
export function notifyRevisionRequested(opts: {
  creatorUserId: string;
  creatorName: string;
  applicationId: string;
  campaignTitle: string;
  note?: string;
}): Promise<void> {
  return safeNotify('revision_requested', () =>
    notify({
      recipient: opts.creatorUserId,
      type: 'revision_requested',
      message: `A revision was requested on your submission for "${opts.campaignTitle}".`,
      deepLinkPath: `/collabs/${opts.applicationId}/submit`,
      email: revisionRequestedEmail({
        creatorName: opts.creatorName,
        campaignTitle: opts.campaignTitle,
        note: opts.note,
      }),
    }),
  );
}
