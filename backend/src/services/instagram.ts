/**
 * Instagram (Meta) client for the DM-code verification flow.
 *
 * Three capabilities, all against the Instagram Graph API:
 *   - verify an inbound webhook's signature (X-Hub-Signature-256, keyed by app secret)
 *   - read a DM sender's profile (username + follower_count) once they've messaged us
 *   - DM the verification code back to that sender
 *
 * Best-effort and never throws (mirrors the email/SMS services). Unconfigured in dev,
 * the real calls are skipped — the flow is exercised through the dev-simulate route
 * instead, so the whole UI is testable before Meta App Review clears.
 */
import crypto from 'node:crypto';
import { env } from '../lib/env';

const GRAPH = 'https://graph.instagram.com/v21.0';

/** True when Meta credentials are present (real webhook + Graph API calls enabled). */
export function isInstagramConfigured(): boolean {
  return Boolean(env.instagram.accessToken && env.instagram.appSecret);
}

/**
 * Normalise whatever the creator typed — "@foo", "foo", or a profile link like
 * "instagram.com/foo?igsh=…" — to a bare lowercase username, or null if it isn't a
 * valid IG handle. Instagram usernames are letters/digits/`.`/`_`, up to 30 chars.
 */
export function extractInstagramHandle(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  const urlMatch = s.match(/instagram\.com\/([^/?#]+)/);
  if (urlMatch) s = urlMatch[1];
  s = s.replace(/^@/, '').replace(/[/?#].*$/, '');
  return /^[a-z0-9._]{1,30}$/.test(s) ? s : null;
}

/**
 * Verify Meta's `X-Hub-Signature-256` over the *raw* request body. Constant-time.
 * Returns false when unconfigured or the header is missing/malformed.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!env.instagram.appSecret || !signatureHeader?.startsWith('sha256=')) return false;
  const expected = crypto
    .createHmac('sha256', env.instagram.appSecret)
    .update(rawBody)
    .digest('hex');
  const provided = signatureHeader.slice('sha256='.length);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface InstagramProfile {
  username: string;
  followerCount: number;
  name?: string;
}

/**
 * Read a DM sender's profile. Meta only permits this *after* the user has messaged
 * our account (the consent the "hi" DM establishes). Returns null on any error.
 */
export async function getInstagramProfile(igsid: string): Promise<InstagramProfile | null> {
  if (!isInstagramConfigured()) return null;
  try {
    const url = `${GRAPH}/${igsid}?fields=username,follower_count,name&access_token=${encodeURIComponent(
      env.instagram.accessToken,
    )}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[instagram] profile ${igsid} → ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { username?: string; follower_count?: number; name?: string };
    if (!data.username) return null;
    return { username: data.username.toLowerCase(), followerCount: data.follower_count ?? 0, name: data.name };
  } catch (err) {
    console.error(`[instagram] profile error: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

/** DM `text` to a sender (the verification code). Best-effort. */
export async function sendInstagramDm(igsid: string, text: string): Promise<{ sent: boolean; reason?: string }> {
  if (!isInstagramConfigured()) return { sent: false, reason: 'Instagram is not configured' };
  try {
    const res = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(env.instagram.accessToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: igsid }, message: { text } }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { sent: false, reason: `Instagram responded ${res.status}: ${body.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'unknown transport error' };
  }
}
