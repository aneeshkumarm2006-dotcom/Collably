/**
 * Stateless signed session for the password gate. The login route issues an
 * HMAC-signed token (over an issued-at timestamp); middleware + API routes verify
 * it. Implemented with the Web Crypto API + btoa/atob only, so the SAME code runs
 * in the Edge middleware runtime and the Node route handlers.
 */

export const SESSION_COOKIE = 'admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12h
export const SESSION_MAX_AGE = MAX_AGE_SECONDS;

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('ADMIN_SESSION_SECRET is not set');
  return s;
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bytesToB64url(new Uint8Array(sig));
}

/** Constant-time string compare (both are hex/base64url of equal length on the happy path). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i += 1) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(): Promise<string> {
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({ iat: Date.now() })));
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  let expected: string;
  try {
    expected = await sign(payload);
  } catch {
    return false;
  }
  if (!safeEqual(sig, expected)) return false;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload))) as { iat?: number };
    if (typeof parsed.iat !== 'number') return false;
    return Date.now() - parsed.iat <= MAX_AGE_SECONDS * 1000;
  } catch {
    return false;
  }
}
