import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { notificationQuerySchema } from '../validations/notification.validation.js';

const router = Router();

router.use(authenticate);

// GET /api/notifications
router.get('/', validate(notificationQuerySchema, 'query'), (req, res, next) => {
  notificationController.listNotifications(req, res, next);
});

// PATCH /api/notifications/read-all
router.patch('/read-all', (req, res, next) => {
  notificationController.markAllAsRead(req, res, next);
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res, next) => {
  notificationController.markAsRead(req, res, next);
});

export default router;
