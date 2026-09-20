import { Router } from 'express';
import * as controller from '../controllers/timetable.controller.js';
import { validate } from '../middleware/validate.js';
import {
  idParam,
  timetableSchema,
  timetableUpdateSchema,
  timetableBulkSchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/', controller.list);
router.post('/', validate({ body: timetableSchema }), controller.create);
router.post('/bulk', validate({ body: timetableBulkSchema }), controller.createMany);
router.put('/:id', validate({ params: idParam, body: timetableUpdateSchema }), controller.update);
router.delete('/:id', validate({ params: idParam }), controller.remove);

export default router;
