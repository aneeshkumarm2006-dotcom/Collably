/**
 * Resend transactional email (PRD §9.2, §17). One low-level `sendEmail` talks to
 * the Resend HTTP API; the rest of the file is a template per trigger in the
 * §9.2 table. Templates are pure (they return `{ subject, html, text }`) so they
 * can be unit-tested without sending, and so the push/notify layer can reuse the
 * rendered email.
 *
 * Sending is **best-effort**: if `RESEND_API_KEY` isn't set we log and return a
 * skipped result instead of throwing, so a missing email provider never breaks a
 * core flow (the in-app Notification is the source of truth).
 */
import { env } from '../lib/env';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Brand constants for the shared email layout. */
const BRAND = {
  name: 'Collably',
  accent: '#0C831F',
  // Deep-link scheme the mobile app registers (PRD §8.2). Used in email CTAs.
  scheme: 'collably://',
} as const;

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailInput extends EmailContent {
  to: string;
}

export interface SendEmailResult {
  /** `true` when Resend accepted the message; `false` when skipped/failed. */
  sent: boolean;
  /** Resend message id when sent. */
  id?: string;
  /** Reason it was skipped or the error message when it failed. */
  reason?: string;
}

/** True when Resend is configured enough to send. */
export function isResendConfigured(): boolean {
  return Boolean(env.resend.apiKey && env.resend.from);
}

/** Mask an email for logs — keep the first char + domain, hide the rest of the
 * local-part so recipient PII doesn't accumulate in server logs. */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

/**
 * Send one email via Resend. Never throws — returns `{ sent: false, reason }`
 * when skipped (unconfigured) or on transport/API error, so callers can treat
 * email as best-effort.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isResendConfigured()) {
    const reason = 'Resend is not configured (RESEND_API_KEY / RESEND_FROM unset)';
    if (!env.isProd) console.warn(`[resend] skipped → ${maskEmail(input.to)}: ${reason}`);
    return { sent: false, reason };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.resend.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const reason = `Resend responded ${res.status}: ${body.slice(0, 200)}`;
      console.error(`[resend] failed → ${maskEmail(input.to)}: ${reason}`);
      return { sent: false, reason };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: data.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown transport error';
    console.error(`[resend] error → ${maskEmail(input.to)}: ${reason}`);
    return { sent: false, reason };
  }
}

// --- Template helpers ---------------------------------------------------------

/** Minimal HTML escape so dynamic values can't break the markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wrap body content in the shared branded layout. `cta`, when present, renders a
 * button; the matching plain-text version is appended for the `text` part.
 */
function layout(opts: {
  heading: string;
  bodyHtml: string;
  bodyText: string;
  cta?: { label: string; url: string };
}): EmailContent {
  const ctaHtml = opts.cta
    ? `<tr><td style="padding:24px 0 8px;">
         <a href="${esc(opts.cta.url)}" style="background:${BRAND.accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block;">${esc(
           opts.cta.label,
         )}</a>
       </td></tr>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px;max-width:480px;">
        <tr><td style="font-size:20px;font-weight:700;color:${BRAND.accent};padding-bottom:16px;">${BRAND.name}</td></tr>
        <tr><td style="font-size:18px;font-weight:600;padding-bottom:12px;">${esc(opts.heading)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.55;color:#3a3a3a;">${opts.bodyHtml}</td></tr>
        ${ctaHtml}
        <tr><td style="font-size:12px;color:#9a9a9a;padding-top:28px;border-top:1px solid #eee;">You're receiving this because you have a ${BRAND.name} account. Manage notifications in the app under Settings.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `${BRAND.name}`,
    '',
    opts.heading,
    '',
    opts.bodyText,
    ...(opts.cta ? ['', `${opts.cta.label}: ${opts.cta.url}`] : []),
    '',
    `You're receiving this because you have a ${BRAND.name} account.`,
  ].join('\n');

  return { subject: opts.heading, html, text };
}

// --- Per-trigger templates (PRD §9.2) ----------------------------------------
//
// Each returns rendered `EmailContent`. The route/notify layer pairs these with
// the recipient address. Names mirror the §9.2 trigger table.

/** Account created — sent to both businesses and creators on signup. */
export function accountCreatedEmail(p: { name: string }): EmailContent {
  return layout({
    heading: `Welcome to ${BRAND.name}, ${esc(p.name)}!`,
    bodyHtml: 'Your account is ready. Open the app to finish your profile and start collaborating.',
    bodyText: 'Your account is ready. Open the app to finish your profile and start collaborating.',
    cta: { label: 'Open Collably', url: BRAND.scheme },
  });
}

/**
 * Password reset CTA link. Prefers the **web** reset route
 * (`<WEB_APP_URL>/reset-password/<token>`) when `WEB_APP_URL` is configured —
 * the website is the canonical reset surface (it auto-logs-in on success). Falls
 * back to the mobile `collably://reset-password?token=` deep link otherwise, so
 * the flow keeps working before the website is deployed.
 */
function passwordResetUrl(token: string): string {
  if (env.webAppUrl) {
    return `${env.webAppUrl}/reset-password/${encodeURIComponent(token)}`;
  }
  return `${BRAND.scheme}reset-password?token=${encodeURIComponent(token)}`;
}

/** Password reset — raw token links into the reset screen (PRD §8.2). */
export function passwordResetEmail(p: { name: string; token: string }): EmailContent {
  const url = passwordResetUrl(p.token);
  return layout({
    heading: 'Reset your password',
    bodyHtml: `Hi ${esc(
      p.name,
    )}, tap the button below to choose a new password. This link expires soon — if you didn't request it, you can safely ignore this email.`,
    bodyText: `Hi ${p.name}, use this link to choose a new password (it expires soon). If you didn't request it, ignore this email.`,
    cta: { label: 'Choose a new password', url },
  });
}

/** New application received — sent to the business. */
export function newApplicationEmail(p: {
  businessName: string;
  creatorName: string;
  campaignTitle: string;
}): EmailContent {
  return layout({
    heading: 'You have a new application',
    bodyHtml: `<strong>${esc(p.creatorName)}</strong> applied to <strong>${esc(
      p.campaignTitle,
    )}</strong>. Review their pitch and profile in the app.`,
    bodyText: `${p.creatorName} applied to "${p.campaignTitle}". Review their pitch in the app.`,
    cta: { label: 'Review application', url: BRAND.scheme },
  });
}

/** Application accepted — sent to the creator. */
export function applicationAcceptedEmail(p: {
  creatorName: string;
  campaignTitle: string;
  businessName: string;
}): EmailContent {
  return layout({
    heading: "You're in! 🎉",
    bodyHtml: `${esc(p.businessName)} accepted you for <strong>${esc(
      p.campaignTitle,
    )}</strong>. Check the deadline and deliverables, then create and submit your content.`,
    bodyText: `${p.businessName} accepted you for "${p.campaignTitle}". Check the deliverables and submit your content.`,
    cta: { label: 'View collaboration', url: BRAND.scheme },
  });
}

/** Application rejected — sent to the creator. */
export function applicationRejectedEmail(p: {
  creatorName: string;
  campaignTitle: string;
}): EmailContent {
  return layout({
    heading: 'Update on your application',
    bodyHtml: `Your application to <strong>${esc(
      p.campaignTitle,
    )}</strong> wasn't selected this time. Plenty more collabs are waiting — keep applying!`,
    bodyText: `Your application to "${p.campaignTitle}" wasn't selected this time. Keep applying — more collabs are waiting!`,
    cta: { label: 'Explore campaigns', url: BRAND.scheme },
  });
}

/** Creator submitted content — sent to the business. */
export function submissionReceivedEmail(p: {
  creatorName: string;
  campaignTitle: string;
}): EmailContent {
  return layout({
    heading: 'Content submitted for review',
    bodyHtml: `<strong>${esc(p.creatorName)}</strong> submitted content for <strong>${esc(
      p.campaignTitle,
    )}</strong>. Review and verify it in the app.`,
    bodyText: `${p.creatorName} submitted content for "${p.campaignTitle}". Review and verify it in the app.`,
    cta: { label: 'Review submission', url: BRAND.scheme },
  });
}

/** Submission verified — sent to the creator. */
export function submissionVerifiedEmail(p: {
  creatorName: string;
  campaignTitle: string;
}): EmailContent {
  return layout({
    heading: 'Your submission was verified ✅',
    bodyHtml: `Nice work! Your content for <strong>${esc(
      p.campaignTitle,
    )}</strong> has been verified and the collaboration is complete.`,
    bodyText: `Your content for "${p.campaignTitle}" has been verified and the collaboration is complete. Nice work!`,
    cta: { label: 'View collaboration', url: BRAND.scheme },
  });
}

/** Revision requested — sent to the creator. */
export function revisionRequestedEmail(p: {
  creatorName: string;
  campaignTitle: string;
  note?: string;
}): EmailContent {
  const noteHtml = p.note ? `<br/><br/><em>"${esc(p.note)}"</em>` : '';
  const noteText = p.note ? `\n\nNote: "${p.note}"` : '';
  return layout({
    heading: 'A revision was requested',
    bodyHtml: `The business asked for a revision on your submission for <strong>${esc(
      p.campaignTitle,
    )}</strong>. Update your content and resubmit.${noteHtml}`,
    bodyText: `The business asked for a revision on your submission for "${p.campaignTitle}". Update and resubmit.${noteText}`,
    cta: { label: 'Update submission', url: BRAND.scheme },
  });
}

/** Campaign expiring in ~48h — sent to the business. */
export function campaignExpiringEmail(p: {
  businessName: string;
  campaignTitle: string;
}): EmailContent {
  return layout({
    heading: 'Your campaign is expiring soon',
    bodyHtml: `<strong>${esc(
      p.campaignTitle,
    )}</strong> ends in about 48 hours. Review pending applications before it closes.`,
    bodyText: `"${p.campaignTitle}" ends in ~48 hours. Review pending applications before it closes.`,
    cta: { label: 'Review applications', url: BRAND.scheme },
  });
}

/** New campaign matching a creator's niche — toggleable email (PRD §9.2). */
export function newMatchingCampaignEmail(p: {
  creatorName: string;
  campaignTitle: string;
  businessName: string;
}): EmailContent {
  return layout({
    heading: 'A new campaign matches your niche',
    bodyHtml: `${esc(p.businessName)} just posted <strong>${esc(
      p.campaignTitle,
    )}</strong>, which fits what you create. Apply early — spots are limited.`,
    bodyText: `${p.businessName} posted "${p.campaignTitle}", which matches your niche. Apply early — spots are limited.`,
    cta: { label: 'View campaign', url: BRAND.scheme },
  });
}
