/**
 * Phase 4 checkpoint script — proves the auth stack works end-to-end:
 *   register → login → call a protected route with the token.
 *
 * Run it two ways (mirrors verifyModels):
 *   • Offline (no DB):  unit-checks the building blocks — password hash/verify,
 *     JWT sign/verify (incl. wrong-type + tamper rejection), and the role-guard
 *     middleware. No connection needed.
 *   • Online (MONGODB_URI set): additionally boots the real Express app on an
 *     ephemeral port and drives the full HTTP flow with fetch:
 *       register → me(✓) → me(no token ✗) → login(wrong ✗) → login(✓) →
 *       refresh → forgot-password → reset-password → login(new password ✓),
 *     then deletes the test user.
 *
 * Usage:
 *   npm run build && npm run verify:auth
 *   MONGODB_URI="mongodb+srv://..." npm run verify:auth
 */
import assert from 'node:assert';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app';
import { connectDB, disconnectDB, isDbConnected } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/password';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt';
import { businessOnly, creatorOnly } from '../middleware/authorize';
import { AppError } from '../middleware/errorHandler';
import { User } from '../models';
import type { Request, RequestHandler, Response } from 'express';

const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const info = (msg: string) => console.log(msg);

/** Offline pass — runs with or without a database. */
async function verifyPrimitives(): Promise<void> {
  info('\n[1] Offline auth primitives');

  // Password hashing round-trips and rejects wrong inputs.
  const hash = await hashPassword('correct horse battery');
  assert(hash !== 'correct horse battery', 'hash must differ from plaintext');
  assert(await verifyPassword('correct horse battery', hash), 'correct password should verify');
  assert(!(await verifyPassword('wrong', hash)), 'wrong password should not verify');
  assert(!(await verifyPassword('x', null)), 'verify against null hash should be false');
  ok('password hash/verify round-trip');

  // JWT: valid access token verifies; wrong type + tampered token are rejected.
  const access = signAccessToken('507f1f77bcf86cd799439011', 'creator');
  const claims = verifyToken(access, 'access');
  assert(
    claims.sub === '507f1f77bcf86cd799439011' && claims.role === 'creator',
    'claims round-trip',
  );
  assert.throws(
    () => verifyToken(access, 'refresh'),
    /Invalid or expired token/,
    'access ≠ refresh',
  );
  const refresh = signRefreshToken('507f1f77bcf86cd799439011', 'business');
  assert.throws(
    () => verifyToken(refresh, 'access'),
    /Invalid or expired token/,
    'refresh ≠ access',
  );
  assert.throws(
    () => verifyToken(access + 'x', 'access'),
    /Invalid or expired token/,
    'tamper rejected',
  );
  ok('JWT sign/verify + type separation + tamper rejection');

  // Role guards: allow the matching role, 403 others, 401 when unauthenticated.
  const run = (mw: RequestHandler, role?: string) => {
    let nexted = false;
    let thrown: unknown;
    const req = { user: role ? { role } : undefined } as unknown as Request;
    try {
      mw(req, {} as Response, () => {
        nexted = true;
      });
    } catch (err) {
      thrown = err;
    }
    return { nexted, thrown };
  };
  assert(run(creatorOnly, 'creator').nexted, 'creatorOnly allows creator');
  assert(
    (run(creatorOnly, 'business').thrown as AppError)?.statusCode === 403,
    'creatorOnly blocks business',
  );
  assert(
    (run(businessOnly, undefined).thrown as AppError)?.statusCode === 401,
    'guard requires auth',
  );
  ok('role guards: allow / 403 / 401');
}

/** Online pass — boots the real app and drives the HTTP auth flow. */
async function verifyHttpFlow(): Promise<void> {
  info('\n[2] Online HTTP flow (register → login → protected route)');

  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}/api/auth`;

  const stamp = Date.now();
  const email = `auth-check+${stamp}@example.com`;
  const password = 'initialPassw0rd';

  type Json = Record<string, unknown>;
  const call = async (path: string, body?: Json, token?: string) => {
    const res = await fetch(`${base}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, body: (await res.json()) as Json };
  };

  try {
    // Register.
    const reg = await call('/register', { name: 'Auth Check', email, password, role: 'creator' });
    assert(reg.status === 201, `register → 201 (got ${reg.status})`);
    assert(typeof reg.body.accessToken === 'string', 'register returns accessToken');
    assert(typeof reg.body.refreshToken === 'string', 'register returns refreshToken');
    assert(!('passwordHash' in (reg.body.user as Json)), 'user payload omits passwordHash');
    ok('register → 201 with tokens, no secrets leaked');

    const accessToken = reg.body.accessToken as string;
    const refreshToken = reg.body.refreshToken as string;

    // Duplicate register is rejected.
    const dup = await call('/register', { name: 'Dup', email, password, role: 'creator' });
    assert(dup.status === 409, `duplicate register → 409 (got ${dup.status})`);
    ok('duplicate email → 409');

    // Protected route with + without token.
    const meOk = await call('/me', undefined, accessToken);
    assert(meOk.status === 200 && (meOk.body.user as Json)?.email === email, 'me with token → 200');
    const meNo = await call('/me');
    assert(meNo.status === 401, `me without token → 401 (got ${meNo.status})`);
    ok('protected /me: 200 with token, 401 without');

    // Login: wrong then right.
    const bad = await call('/login', { email, password: 'nope' });
    assert(bad.status === 401, `login wrong password → 401 (got ${bad.status})`);
    const good = await call('/login', { email, password });
    assert(good.status === 200 && typeof good.body.accessToken === 'string', 'login → 200 + token');
    ok('login: 401 on wrong password, 200 + token on correct');

    // Refresh.
    const refreshed = await call('/refresh', { refreshToken });
    assert(
      refreshed.status === 200 && typeof refreshed.body.accessToken === 'string',
      'refresh → 200',
    );
    ok('refresh token → new access token');

    // Password reset: forgot (dev token) → reset → login with new password.
    const forgot = await call('/forgot-password', { email });
    assert(
      forgot.status === 200 && typeof forgot.body.devResetToken === 'string',
      'forgot → 200 + dev token',
    );
    const newPassword = 'changedPassw0rd';
    const reset = await call('/reset-password', {
      token: forgot.body.devResetToken as string,
      password: newPassword,
    });
    assert(
      reset.status === 200 && typeof reset.body.accessToken === 'string',
      'reset → 200 + token',
    );
    const reLogin = await call('/login', { email, password: newPassword });
    assert(reLogin.status === 200, `login with new password → 200 (got ${reLogin.status})`);
    const oldLogin = await call('/login', { email, password });
    assert(oldLogin.status === 401, 'old password no longer works');
    ok('password reset: forgot → reset → login with new password');

    // Validation: malformed body → 400.
    const badBody = await call('/register', { email: 'not-an-email' });
    assert(badBody.status === 400, `invalid body → 400 (got ${badBody.status})`);
    ok('zod validation → 400 on bad input');
  } finally {
    await User.deleteOne({ email });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function main(): Promise<void> {
  info('Phase 4 — auth verification');

  await verifyPrimitives();

  await connectDB();
  const ranHttpFlow = isDbConnected();
  if (ranHttpFlow) {
    await verifyHttpFlow();
    await disconnectDB();
  } else {
    info('\n[2] Online HTTP flow — SKIPPED (no MONGODB_URI / DB unreachable).');
    info('    Set MONGODB_URI and re-run to exercise register/login/protected route.');
  }

  info('\nDone. Auth primitives verified' + (ranHttpFlow ? ' + full HTTP flow passed.' : '.'));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[verifyAuth] FAILED:', err instanceof Error ? err.message : err);
    void disconnectDB().finally(() => process.exit(1));
  });
