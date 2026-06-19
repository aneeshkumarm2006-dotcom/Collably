/**
 * Auth routes (PRD §7.1, §17). JWT register/login/refresh, password reset, and
 * Google sign-in. Every route validates its body with zod; the central error
 * handler turns `ZodError` / `AppError` into clean JSON responses.
 *
 *   POST /api/auth/register         create account + return tokens
 *   POST /api/auth/login            email + password → tokens
 *   POST /api/auth/refresh          refresh token → new token pair
 *   POST /api/auth/forgot-password  start a password reset (email wired in Phase 5)
 *   POST /api/auth/reset-password   complete a password reset
 *   POST /api/auth/google           verify Google ID token, find-or-create user
 *   GET  /api/auth/me               current user (protected — checkpoint route)
 */
import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { User, type UserDoc } from '../models/User';
import { BusinessProfile } from '../models/BusinessProfile';
import { CreatorProfile } from '../models/CreatorProfile';
import { Campaign } from '../models/Campaign';
import { Application } from '../models/Application';
import { Notification } from '../models/Notification';
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from '../lib/password';
import { signTokenPair, verifyToken } from '../lib/jwt';
import { verifyGoogleIdToken } from '../lib/google';
import { toPublicUser } from '../lib/serialize';
import { asyncHandler } from '../lib/utils';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/authenticate';
import { env } from '../lib/env';
import { sendEmail, passwordResetEmail } from '../services';

const router = Router();

// --- Shared validation pieces -------------------------------------------------

const emailSchema = z.string().trim().toLowerCase().email('A valid email is required');
const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(128, 'Password is too long');
// Self-service signup is business/creator only — admin accounts are seeded.
const signupRoleSchema = z.enum(['business', 'creator']);

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: emailSchema,
  password: passwordSchema,
  role: signupRoleSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required'),
  password: passwordSchema,
});

const googleSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
  // Required only when the Google account is brand new (no existing user).
  role: signupRoleSchema.optional(),
});

// --- Helpers ------------------------------------------------------------------

/** Standard success body: the public user plus a fresh access/refresh pair. */
function authResponse(user: UserDoc) {
  return { user: toPublicUser(user), ...signTokenPair(user.id, user.role) };
}

/** Hash a raw reset token the same way for storage and lookup. */
function hashResetToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// --- Routes -------------------------------------------------------------------

/** POST /api/auth/register — create a User and return tokens. */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = registerSchema.parse(req.body);

    if (await User.exists({ email })) {
      throw new AppError(409, 'An account with this email already exists');
    }

    let user: UserDoc;
    try {
      user = await User.create({ name, email, role, passwordHash: await hashPassword(password) });
    } catch (err) {
      // Unique-index race: two registrations for the same email at once.
      if ((err as { code?: number }).code === 11000) {
        throw new AppError(409, 'An account with this email already exists');
      }
      throw err;
    }

    res.status(201).json(authResponse(user));
  }),
);

/** POST /api/auth/login — verify credentials and return tokens. */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    // passwordHash is select:false — opt in explicitly for the comparison.
    const user = await User.findOne({ email }).select('+passwordHash');
    // Same generic message whether the email or password is wrong (no enumeration).
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password');
    }

    res.status(200).json(authResponse(user));
  }),
);

/** POST /api/auth/refresh — exchange a valid refresh token for a new pair. */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const claims = verifyToken(refreshToken, 'refresh');

    const user = await User.findById(claims.sub);
    if (!user) {
      throw new AppError(401, 'Account no longer exists');
    }

    // Rotate: issue a brand-new access + refresh pair on every refresh.
    res.status(200).json(authResponse(user));
  }),
);

/**
 * POST /api/auth/forgot-password — generate a reset token and (Phase 5) email it.
 * Always responds 200 with the same body so attackers can't probe which emails
 * are registered. The raw token is hashed before storage; in non-production it's
 * also returned/logged so the flow is testable before Resend is wired up.
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await User.findOne({ email });

    const generic = { message: 'If an account exists for that email, a reset link has been sent.' };

    if (!user) {
      res.status(200).json(generic);
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashResetToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + env.passwordResetTtlMinutes * 60_000);
    await user.save();

    // Email the reset link (best-effort — `sendEmail` never throws; the deep link
    // `collably://reset-password?token=<rawToken>` is built inside the template).
    await sendEmail({
      to: user.email,
      ...passwordResetEmail({ name: user.name, token: rawToken }),
    });

    // In non-production, also surface the raw token so the flow is testable
    // before a real Resend domain is verified.
    if (!env.isProd) {
      console.log(`[auth] password reset token for ${email}: ${rawToken}`);
      res.status(200).json({ ...generic, devResetToken: rawToken });
      return;
    }

    res.status(200).json(generic);
  }),
);

/** POST /api/auth/reset-password — validate the token and set a new password. */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const user = await User.findOne({
      passwordResetToken: hashResetToken(token),
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new AppError(400, 'This reset link is invalid or has expired');
    }

    user.passwordHash = await hashPassword(password);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Auto-login: hand back a fresh token pair so the app continues seamlessly.
    res.status(200).json(authResponse(user));
  }),
);

/**
 * POST /api/auth/google — verify a Google ID token and find-or-create the user.
 * Matches an existing account by googleId or email (linking googleId on first
 * use); a brand-new account requires a `role` so we know which profile to build.
 */
router.post(
  '/google',
  asyncHandler(async (req, res) => {
    const { idToken, role } = googleSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(idToken);

    let user = await User.findOne({
      $or: [{ googleId: profile.googleId }, { email: profile.email }],
    });
    let isNewUser = false;

    if (user) {
      // Link the Google identity to a pre-existing (e.g. password) account once.
      if (!user.googleId) {
        user.googleId = profile.googleId;
        if (profile.emailVerified) user.isVerified = true;
        if (!user.avatar && profile.picture) user.avatar = profile.picture;
        await user.save();
      }
    } else {
      if (!role) {
        throw new AppError(400, 'A role (business or creator) is required to create a new account');
      }
      user = await User.create({
        name: profile.name,
        email: profile.email,
        role,
        googleId: profile.googleId,
        avatar: profile.picture ?? null,
        isVerified: profile.emailVerified,
      });
      isNewUser = true;
    }

    res.status(isNewUser ? 201 : 200).json({ ...authResponse(user), isNewUser });
  }),
);

/** GET /api/auth/me — the authenticated user (protected; Phase 4 checkpoint route). */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    // `authenticate` guarantees req.user is set.
    const user = req.user!;
    // `approved` = admin approval of the caller's role profile (the apply/publish
    // gate). Admins are always approved; creators/businesses mirror their profile's
    // `isVerified` (false when the profile doesn't exist yet).
    let approved = user.role === 'admin';
    if (user.role === 'creator') {
      const profile = await CreatorProfile.findOne({ userId: user._id }).select('isVerified');
      approved = Boolean(profile?.isVerified);
    } else if (user.role === 'business') {
      const profile = await BusinessProfile.findOne({ userId: user._id }).select('isVerified');
      approved = Boolean(profile?.isVerified);
    }
    res.status(200).json({ user: toPublicUser(user), approved });
  }),
);

// --- Account settings (PRD §7.3, §7.4 Settings screens) -----------------------

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    avatar: z.string().trim().max(2048).nullable().optional(),
    notificationPrefs: z.object({ push: z.boolean(), email: z.boolean() }).partial().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

/** PATCH /api/auth/me — update the signed-in user's name / avatar / notification prefs. */
router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = updateMeSchema.parse(req.body);
    const user = req.user!;

    if (data.name !== undefined) user.name = data.name;
    if (data.avatar !== undefined) user.avatar = data.avatar;
    if (data.notificationPrefs) {
      const current = user.notificationPrefs ?? { push: true, email: true };
      user.notificationPrefs = {
        push: data.notificationPrefs.push ?? current.push,
        email: data.notificationPrefs.email ?? current.email,
      };
    }
    await user.save();

    res.status(200).json({ user: toPublicUser(user) });
  }),
);

const changePasswordSchema = z.object({
  // Optional so a Google-only account (no existing password) can set one.
  currentPassword: z.string().min(1).optional(),
  newPassword: passwordSchema,
});

/** PATCH /api/auth/password — change password (verifies the current one). */
router.patch(
  '/password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user!._id).select('+passwordHash');
    if (!user) throw new AppError(401, 'Account no longer exists');

    // Accounts that already have a password must prove the current one.
    if (user.passwordHash) {
      if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
        throw new AppError(401, 'Current password is incorrect');
      }
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({ updated: true });
  }),
);

const changeEmailSchema = z.object({
  email: emailSchema,
  // Required to re-authenticate the change for password accounts.
  password: z.string().min(1).optional(),
});

/** PATCH /api/auth/email — change email (verifies password + uniqueness). */
router.patch(
  '/email',
  authenticate,
  asyncHandler(async (req, res) => {
    const { email, password } = changeEmailSchema.parse(req.body);

    const user = await User.findById(req.user!._id).select('+passwordHash');
    if (!user) throw new AppError(401, 'Account no longer exists');

    if (user.passwordHash) {
      if (!password || !(await verifyPassword(password, user.passwordHash))) {
        throw new AppError(401, 'Password is incorrect');
      }
    }
    if (email === user.email) {
      res.status(200).json({ user: toPublicUser(user) });
      return;
    }
    if (await User.exists({ email })) {
      throw new AppError(409, 'An account with this email already exists');
    }

    user.email = email;
    // A new email is unverified until re-confirmed.
    user.isVerified = false;
    await user.save();

    res.status(200).json({ user: toPublicUser(user) });
  }),
);

const deleteMeSchema = z.object({ password: z.string().min(1).optional() }).optional();

/**
 * DELETE /api/auth/me — permanently delete the account and its data (PRD §7.3).
 * Cascades the user's role profile, campaigns/applications, and notifications so
 * nothing is orphaned.
 */
router.delete(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const body = deleteMeSchema.parse(req.body);

    const user = await User.findById(req.user!._id).select('+passwordHash');
    if (!user) throw new AppError(401, 'Account no longer exists');

    if (user.passwordHash) {
      if (!body?.password || !(await verifyPassword(body.password, user.passwordHash))) {
        throw new AppError(401, 'Password is incorrect');
      }
    }

    if (user.role === 'business') {
      const profile = await BusinessProfile.findOne({ userId: user._id }).select('_id');
      if (profile) {
        const campaigns = await Campaign.find({ businessId: profile._id }).select('_id');
        const campaignIds = campaigns.map((c) => c._id);
        await Application.deleteMany({ businessId: profile._id });
        if (campaignIds.length) await Campaign.deleteMany({ _id: { $in: campaignIds } });
        await profile.deleteOne();
      }
    } else if (user.role === 'creator') {
      const profile = await CreatorProfile.findOne({ userId: user._id }).select('_id');
      if (profile) {
        await Application.deleteMany({ creatorId: profile._id });
        await profile.deleteOne();
      }
    }

    await Notification.deleteMany({ userId: user._id });
    await user.deleteOne();

    res.status(200).json({ deleted: true });
  }),
);

export default router;
