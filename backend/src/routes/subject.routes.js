import { Router } from 'express';
import * as controller from '../controllers/subject.controller.js';
import { validate } from '../middleware/validate.js';
import { idParam, subjectSchema, subjectUpdateSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', controller.list);
router.post('/', validate({ body: subjectSchema }), controller.create);
router.get('/:id', validate({ params: idParam }), controller.get);
router.put('/:id', validate({ params: idParam, body: subjectUpdateSchema }), controller.update);
router.delete('/:id', validate({ params: idParam }), controller.remove);

export default router;
