import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import profilesRouter from './profiles';
import campaignsRouter from './campaigns';
import geocodingRouter from './geocoding';
import applicationsRouter from './applications';
import favoritesRouter from './favorites';
import verifyInstagramRouter from './verifyInstagram';
import webhooksRouter from './webhooks';
import conversationsRouter from './conversations';
import notificationsRouter from './notifications';
import uploadRouter from './upload';
import pushRouter from './push';
import reportsRouter from './reports';
import blocksRouter from './blocks';
import adminRouter from './admin';

/**
 * Root API router. All feature routers mount here under `/api`. Phase 6 wires the
 * full surface from PRD §18: profiles, campaigns, applications, notifications,
 * upload, push, reports, and the admin moderation routes.
 */
const api = Router();

api.use('/health', healthRouter);
api.use('/auth', authRouter);
api.use('/profile', profilesRouter);
api.use('/campaigns', campaignsRouter);
api.use('/geocoding', geocodingRouter);
api.use('/applications', applicationsRouter);
api.use('/favorites', favoritesRouter);
api.use('/verify/instagram', verifyInstagramRouter);
api.use('/webhooks', webhooksRouter);
api.use('/conversations', conversationsRouter);
api.use('/notifications', notificationsRouter);
api.use('/upload', uploadRouter);
api.use('/push', pushRouter);
api.use('/reports', reportsRouter);
api.use('/blocks', blocksRouter);
api.use('/admin', adminRouter);

export default api;
