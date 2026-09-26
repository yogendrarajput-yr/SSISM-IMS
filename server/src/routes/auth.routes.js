import { Router } from 'express';
import { login, refresh, logout, getMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema } from '../utils/validators.js';

/**
 * Authentication Routes (/api/auth)
 * Handles secure session establishment, token refresh, and identity verification.
 */
const router = Router();


router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
