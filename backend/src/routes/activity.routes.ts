import { Router } from 'express';
import { activityController } from '../controllers/activity.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { activityQuerySchema } from '../validations/notification.validation.js';

const router = Router();

router.use(authenticate);

// GET /api/activity - Role-scoped latest 20 events with cursor
router.get('/', validate(activityQuerySchema, 'query'), (req, res, next) => {
  activityController.getActivityFeed(req, res, next);
});

// GET /api/activity/missed - Missed event catch-up based on users.last_seen_at
router.get('/missed', (req, res, next) => {
  activityController.getMissedActivities(req, res, next);
});

export default router;
