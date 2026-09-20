import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/attendance.controller.js';
import { validate } from '../middleware/validate.js';
import {
  idParam,
  uuid,
  sessionQuerySchema,
  sessionCreateSchema,
  sessionUpdateSchema,
  bulkMarkSchema,
  rescheduleSchema,
  generateSchema,
  predictionQuerySchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/', validate({ query: sessionQuerySchema }), controller.list);
router.post('/', validate({ body: sessionCreateSchema }), controller.create);
router.post('/generate', validate({ body: generateSchema }), controller.generate);
router.post('/bulk', validate({ body: bulkMarkSchema }), controller.bulkMark);

router.get('/today', controller.today);
router.get('/summary', validate({ query: sessionQuerySchema }), controller.summary);
router.get('/predictions', controller.predictions);
router.get(
  '/:subjectId/prediction',
  validate({ params: z.object({ subjectId: uuid }), query: predictionQuerySchema }),
  controller.prediction,
);

router.put('/:id', validate({ params: idParam, body: sessionUpdateSchema }), controller.update);
router.post('/:id/reschedule', validate({ params: idParam, body: rescheduleSchema }), controller.reschedule);
router.delete('/:id', validate({ params: idParam }), controller.remove);

export default router;
