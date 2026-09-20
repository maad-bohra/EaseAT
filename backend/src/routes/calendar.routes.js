import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/calendar.controller.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import {
  idParam,
  calendarQuerySchema,
  calendarEventSchema,
  calendarUpdateSchema,
  verifySchema,
  dayQuerySchema,
  monthQuerySchema,
} from '../validators/schemas.js';

const router = Router();

// PDFs only, held in memory and checked before anything touches storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.storage.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(ApiError.badRequest('Upload a PDF file'));
    cb(null, true);
  },
});

router.get('/', validate({ query: calendarQuerySchema }), controller.list);
router.get('/month', validate({ query: monthQuerySchema }), controller.month);
router.get('/day', validate({ query: dayQuerySchema }), controller.day);
router.post('/', validate({ body: calendarEventSchema }), controller.create);
router.post('/verify', validate({ body: verifySchema }), controller.verify);
router.put('/:id', validate({ params: idParam, body: calendarUpdateSchema }), controller.update);
router.delete('/:id', validate({ params: idParam }), controller.remove);

router.post('/upload', upload.single('file'), controller.upload);
router.get('/uploads', controller.listUploads);
router.delete('/uploads/:id', validate({ params: idParam }), controller.removeUpload);

export default router;
