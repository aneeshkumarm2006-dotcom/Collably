/**
 * Transactional email (PRD §9.2, §17). One low-level `sendEmail` dispatches to a
 * transport; the rest of the file is a template per trigger in the §9.2 table.
 * Templates are pure (they return `{ subject, html, text }`) so they can be
 * unit-tested without sending, and so the push/notify layer can reuse the
 * rendered email.
 *
 * Two transports, tried in order: **Gmail SMTP** (an App Password) when
 * configured, else **Resend** (HTTP API). Gmail wins because it needs no domain
 * verification — good enough to launch. Resend is the higher-deliverability path
 * for later.
 *
 * Sending is **best-effort**: if no transport is configured we log and return a
 * skipped result instead of throwing, so a missing email provider never breaks a
 * core flow (the in-app Notification is the source of truth).
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../lib/env';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Brand constants for the shared email layout. */
const BRAND = {
  name: 'Local Creator Crew',
  accent: '#0C831F',
  // Deep-link scheme the mobile app registers (PRD §8.2). Used in email CTAs.
  // NOTE: the `collably://` scheme is an identifier, NOT the display name — it
  // stays as-is so existing deep links / OAuth / builds keep working.
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
  /** `true` when a transport accepted the message; `false` when skipped/failed. */
  sent: boolean;
  /** Provider message id when sent. */
  id?: string;
  /** Reason it was skipped or the error message when it failed. */
  reason?: string;
}

/** True when Gmail SMTP is configured enough to send. */
export function isGmailConfigured(): boolean {
  return Boolean(env.gmail.user && env.gmail.appPassword);
}

/** True when Resend is configured enough to send. */
export function isResendConfigured(): boolean {
  return Boolean(env.resend.apiKey && env.resend.from);
}

/** True when at least one email transport can send. */
export function isEmailConfigured(): boolean {
  return isGmailConfigured() || isResendConfigured();
}

/** Mask an email for logs — keep the first char + domain, hide the rest of the
 * local-part so recipient PII doesn't accumulate in server logs. */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

/**
 * Lazily-built Gmail transporter, reused across sends (a fresh SMTP connection
 * per email is slow and can trip Gmail's rate limits). Built only once Gmail is
 * configured, so an unconfigured deploy never touches nodemailer.
 */
let gmailTransport: Transporter | null = null;
function getGmailTransport(): Transporter {
  if (!gmailTransport) {
    gmailTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.gmail.user, pass: env.gmail.appPassword },
      // Hard caps so a blocked/slow SMTP path fails fast instead of hanging the
      // user's HTTP request. Some hosts (e.g. Render) block outbound SMTP; without
      // these the connect() hangs for minutes and the signup/reset call hangs with
      // it. 10s is generous for a reachable server, instant-ish when blocked.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return gmailTransport;
}

/** Send via Gmail SMTP. Never throws — returns a result the caller can log. */
async function sendViaGmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    // App Passwords can only send as their own account; a spoofed From is dropped
    // by Gmail. Use the display-name override if given, else the account address.
    const from = env.gmail.from || env.gmail.user;
    const info = await getGmailTransport().sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { sent: true, id: info.messageId };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown SMTP error';
    console.error(`[gmail] error → ${maskEmail(input.to)}: ${reason}`);
    return { sent: false, reason };
  }
}

/** Send via the Resend HTTP API. Never throws. */
async function sendViaResend(input: SendEmailInput): Promise<SendEmailResult> {
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
      // Never let a slow provider hang the request (mirrors the Gmail caps).
      signal: AbortSignal.timeout(10_000),
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

/**
 * Send one email. Tries Gmail SMTP first; if that fails AND Resend is configured,
 * falls back to Resend automatically. Skips (never throws) when neither is set.
 *
 * The fallback matters on hosts that block outbound SMTP (e.g. Render): Gmail
 * fails fast via the transport timeouts, then Resend (HTTPS) delivers. For best
 * latency on such a host, unset the GMAIL_* vars there so it goes straight to
 * Resend rather than eating the ~10s Gmail timeout on every send.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (isGmailConfigured()) {
    const result = await sendViaGmail(input);
    if (result.sent) return result;
    if (isResendConfigured()) {
      console.warn(`[email] gmail failed, falling back to resend → ${maskEmail(input.to)}`);
      return sendViaResend(input);
    }
    return result;
  }
  if (isResendConfigured()) return sendViaResend(input);

  const reason = 'No email transport configured (set GMAIL_USER+GMAIL_APP_PASSWORD or RESEND_API_KEY+RESEND_FROM)';
  if (!env.isProd) console.warn(`[email] skipped → ${maskEmail(input.to)}: ${reason}`);
  return { sent: false, reason };
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
    cta: { label: 'Open Local Creator Crew', url: BRAND.scheme },
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

/** Email verification — a one-time code the user types back into the app. */
export function verificationCodeEmail(p: { name: string; code: string; ttlMinutes: number }): EmailContent {
  // Space the digits so they're easy to read off and hard to mis-copy.
  const spaced = p.code.split('').join(' ');
  const codeHtml = `<div style="font-size:30px;font-weight:700;letter-spacing:6px;color:${BRAND.accent};background:#f2f5ff;border-radius:12px;padding:16px;text-align:center;margin:8px 0;">${esc(
    p.code,
  )}</div>`;
  return layout({
    heading: 'Verify your email',
    bodyHtml: `Hi ${esc(
      p.name,
    )}, enter this code in the app to confirm your email. It expires in ${p.ttlMinutes} minutes.${codeHtml}If you didn't request this, you can ignore this email.`,
    bodyText: `Hi ${p.name}, your ${BRAND.name} verification code is ${spaced}. It expires in ${p.ttlMinutes} minutes. If you didn't request this, ignore this email.`,
  });
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
