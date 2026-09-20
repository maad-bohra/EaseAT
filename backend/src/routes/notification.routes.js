import { Router } from 'express';
import * as controller from '../controllers/notification.controller.js';
import { validate } from '../middleware/validate.js';
import { idParam, notificationQuerySchema } from '../validators/schemas.js';

const router = Router();

router.get('/', validate({ query: notificationQuerySchema }), controller.list);
router.post('/refresh', controller.refresh);
router.put('/read-all', controller.markAllRead);
router.put('/:id/read', validate({ params: idParam }), controller.markRead);
router.delete('/:id', validate({ params: idParam }), controller.remove);

export default router;
