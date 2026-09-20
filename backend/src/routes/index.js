import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './auth.routes.js';
import subjectRoutes from './subject.routes.js';
import timetableRoutes from './timetable.routes.js';
import attendanceRoutes from './attendance.routes.js';
import calendarRoutes from './calendar.routes.js';
import notificationRoutes from './notification.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

router.use('/auth', authRoutes);

// Everything below needs a valid token, and every service scopes its queries
// by req.user.id so one student can never read another's data.
router.use('/subjects', requireAuth, subjectRoutes);
router.use('/timetable', requireAuth, timetableRoutes);
router.use('/attendance', requireAuth, attendanceRoutes);
router.use('/calendar', requireAuth, calendarRoutes);
router.use('/notifications', requireAuth, notificationRoutes);
router.use('/ai', requireAuth, aiRoutes);

export default router;
