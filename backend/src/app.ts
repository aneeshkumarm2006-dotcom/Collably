import express, { type Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import api from './routes';
import { corsOrigins } from './lib/env';
import { errorHandler, notFound } from './middleware/errorHandler';

/**
 * Build and configure the Express app (without starting the HTTP listener).
 * Kept separate from `index.ts` so it can be imported by tests later.
 */
export function createApp(): Express {
  const app = express();

  // Don't advertise the framework.
  app.disable('x-powered-by');

  // Trust the first proxy hop (Render/Railway sit behind a load balancer) so
  // req.ip / secure cookies + rate-limit IP keying behave correctly in production.
  app.set('trust proxy', 1);

  // Security response headers (equivalent to the subset of `helmet` that matters
  // for a JSON API — set inline to avoid adding a dependency). This is an API that
  // returns JSON and renders no HTML, so `default-src 'none'` is safe and locks the
  // response down completely if anything ever tries to load it as a document.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    next();
  });

  // CORS — never combine a wildcard reflect-any origin with credentials (that
  // lets any site make credentialed cross-origin calls). Credentials are only
  // enabled when an explicit allowlist is configured (set CORS_ORIGIN in prod).
  const origins = corsOrigins();
  app.use(cors({ origin: origins, credentials: origins !== true }));
  app.use(
    express.json({
      limit: '1mb',
      // Stash the raw body for webhook routes so their signature (e.g. Meta's
      // X-Hub-Signature-256) can be verified against the exact received bytes.
      verify: (req, _res, buf) => {
        if (req.url?.includes('/webhooks/')) {
          (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting (brute-force / abuse protection). A generous global cap, plus
  // a stricter cap on the auth surface (login / refresh / password reset).
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: 'Too many attempts. Please try again in a few minutes.' } },
  });
  app.use('/api', globalLimiter);
  app.use('/api/auth', authLimiter);

  // Routes.
  app.use('/api', api);

  // Friendly root so hitting the bare URL isn't a 404.
  app.get('/', (_req, res) => {
    res.json({ name: 'Collably API', health: '/api/health' });
  });

  // 404 + central error handler — must come last.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
