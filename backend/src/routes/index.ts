import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import profilesRouter from './profiles';
import campaignsRouter from './campaigns';
import applicationsRouter from './applications';
import notificationsRouter from './notifications';
import uploadRouter from './upload';
import pushRouter from './push';
import reportsRouter from './reports';
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
api.use('/applications', applicationsRouter);
api.use('/notifications', notificationsRouter);
api.use('/upload', uploadRouter);
api.use('/push', pushRouter);
api.use('/reports', reportsRouter);
api.use('/admin', adminRouter);

export default api;
