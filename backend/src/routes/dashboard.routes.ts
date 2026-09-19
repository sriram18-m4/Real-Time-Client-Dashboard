import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// GET /api/dashboard
router.get('/', (req, res, next) => {
  dashboardController.getDashboard(req, res, next);
});

export default router;
