/**
 * SMS delivery via Twilio's REST API — the phone-OTP channel.
 *
 * Mirrors the Resend email service: best-effort, never throws, and a no-op (with a
 * dev warning) when Twilio isn't configured. That means the phone-verify flow is
 * fully testable *before* real Twilio credentials exist — the endpoint still issues
 * a code, the send is skipped, and (in dev) the code comes back in the response via
 * EXPOSE_DEV_OTP. Drop in the credentials later and the same code path sends real SMS.
 */
import { env } from '../lib/env';

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

export interface SendSmsInput {
  /** Recipient in E.164 (e.g. "+919876543210"). */
  to: string;
  body: string;
}

export interface SendSmsResult {
  sent: boolean;
  /** Twilio message SID when sent. */
  id?: string;
  /** Reason it was skipped or the error when it failed. */
  reason?: string;
}

/** True when Twilio is configured enough to send. */
export function isTwilioConfigured(): boolean {
  return Boolean(env.twilio.accountSid && env.twilio.authToken && env.twilio.from);
}

/** Mask a phone for logs — keep country code + last 2 digits, hide the rest. */
function maskPhone(phone: string): string {
  if (phone.length < 5) return '***';
  return `${phone.slice(0, 3)}***${phone.slice(-2)}`;
}

/**
 * Send one SMS via Twilio. Never throws — returns `{ sent: false, reason }` when
 * skipped (unconfigured) or on transport/API error, so the caller treats SMS as a
 * best-effort side channel.
 */
export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  if (!isTwilioConfigured()) {
    const reason = 'Twilio is not configured (TWILIO_ACCOUNT_SID / AUTH_TOKEN / FROM unset)';
    if (!env.isProd) console.warn(`[twilio] skipped → ${maskPhone(input.to)}: ${reason}`);
    return { sent: false, reason };
  }

  // A "from" beginning with "MG" is a Messaging Service SID; otherwise it's a number.
  const form = new URLSearchParams({ To: input.to, Body: input.body });
  if (env.twilio.from.startsWith('MG')) form.set('MessagingServiceSid', env.twilio.from);
  else form.set('From', env.twilio.from);

  const auth = Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString('base64');

  try {
    const res = await fetch(`${TWILIO_BASE}/Accounts/${env.twilio.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const reason = `Twilio responded ${res.status}: ${body.slice(0, 200)}`;
      console.error(`[twilio] failed → ${maskPhone(input.to)}: ${reason}`);
      return { sent: false, reason };
    }

    const data = (await res.json().catch(() => ({}))) as { sid?: string };
    return { sent: true, id: data.sid };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown transport error';
    console.error(`[twilio] error → ${maskPhone(input.to)}: ${reason}`);
    return { sent: false, reason };
  }
}
