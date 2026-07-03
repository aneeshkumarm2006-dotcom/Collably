import { Router } from 'express';
import { dbStatus } from '../lib/db';

const router = Router();

/**
 * GET /api/health — liveness/readiness probe. Always returns 200 if the process
 * is up; the body reports the DB connection state so deploys and uptime checks
 * can distinguish "server up, DB down" from "server down". Deliberately does NOT
 * echo the environment name or uptime — those are needless recon signals on an
 * unauthenticated endpoint.
 */
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    db: dbStatus(),
  });
});

export default router;
