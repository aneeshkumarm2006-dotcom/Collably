import { Router } from 'express';
import { dbStatus } from '../lib/db';
import { env } from '../lib/env';

const router = Router();

/**
 * GET /api/health — liveness/readiness probe. Always returns 200 if the process
 * is up; the body reports the DB connection state so deploys and uptime checks
 * can distinguish "server up, DB down" from "server down".
 */
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'collably-backend',
    env: env.nodeEnv,
    db: dbStatus(),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
