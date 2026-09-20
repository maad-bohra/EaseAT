import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/ai.controller.js';
import { validate } from '../middleware/validate.js';
import { assistantSchema, nlTimetableSchema, timetableBulkSchema } from '../validators/schemas.js';

const router = Router();

// LLM calls cost money, so they get their own tighter limit.
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });

router.get('/status', controller.status);
router.get('/facts', controller.facts);
router.post('/assistant', aiLimiter, validate({ body: assistantSchema }), controller.ask);
router.post('/timetable/parse', aiLimiter, validate({ body: nlTimetableSchema }), controller.parseTimetable);
router.post('/timetable/confirm', validate({ body: timetableBulkSchema }), controller.confirmTimetable);

export default router;
