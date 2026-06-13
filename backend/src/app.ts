import express, { type Express } from 'express';
import cors from 'cors';
import api from './routes';
import { corsOrigins } from './lib/env';
import { errorHandler, notFound } from './middleware/errorHandler';

/**
 * Build and configure the Express app (without starting the HTTP listener).
 * Kept separate from `index.ts` so it can be imported by tests later.
 */
export function createApp(): Express {
  const app = express();

  // Trust the first proxy hop (Render/Railway sit behind a load balancer) so
  // req.ip / secure cookies behave correctly in production.
  app.set('trust proxy', 1);

  // Core middleware.
  app.use(cors({ origin: corsOrigins(), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

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
