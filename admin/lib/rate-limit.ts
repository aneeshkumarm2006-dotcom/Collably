/**
 * Tiny in-memory login rate-limiter for the admin dashboard: locks an IP after
 * too many failed password attempts for a short window.
 *
 * Caveat: memory is per-process, so on a serverless platform the counts are
 * per-lambda and reset on cold start. For a single shared-password internal gate
 * this is an acceptable speed-bump against brute force; a durable limiter
 * (Redis/Mongo) would be needed for hard guarantees.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Entry {
  count: number;
  /** When the current lockout/window expires (ms epoch). */
  resetAt: number;
}

const attempts = new Map<string, Entry>();

/** True if this IP is currently locked out. */
export function isLocked(ip: string): boolean {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

/** Record a failed attempt; starts/extends the window. */
export function registerFailure(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

/** Clear an IP's attempts (after a successful login). */
export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

/**
 * Client IP for keying the limiter. ONLY trust headers a platform/proxy we control
 * overwrites: Vercel's `x-vercel-forwarded-for`, then `x-real-ip` (set by nginx &
 * co. when self-hosted). The raw `x-forwarded-for` is deliberately NOT read — the
 * client controls it, so an attacker could rotate it per request and mint a fresh
 * rate-limit bucket every time, making the lockout worthless. Requests with no
 * trusted header share the 'unknown' bucket — fail closed: better a shared lockout
 * on a misconfigured deploy than unlimited password guesses.
 */
export function clientIp(req: Request): string {
  const vercel = req.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
