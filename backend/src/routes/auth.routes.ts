import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema } from '../validations/auth.validation.js';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/auth/login - Rate limited
router.post('/login', authRateLimiter, validate(loginSchema), (req, res, next) => {
  authController.login(req, res, next);
});

// POST /api/auth/refresh - Rate limited
router.post('/refresh', authRateLimiter, (req, res, next) => {
  authController.refresh(req, res, next);
});

// POST /api/auth/logout - Optional token/cookie
router.post('/logout', (req, res, next) => {
  authController.logout(req, res, next);
});

// GET /api/auth/me - Authenticated
router.get('/me', authenticate, (req, res, next) => {
  authController.getMe(req, res, next);
});

export default router;
