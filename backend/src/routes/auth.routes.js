import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  profileSchema,
  passwordSchema,
} from '../validators/schemas.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Try again in a few minutes.', code: 'RATE_LIMITED' } },
});

router.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);
router.put('/me', requireAuth, validate({ body: profileSchema }), controller.updateProfile);
router.put('/password', requireAuth, validate({ body: passwordSchema }), controller.changePassword);

export default router;
