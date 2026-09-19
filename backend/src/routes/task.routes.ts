import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskQuerySchema,
} from '../validations/task.validation.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// List tasks (All roles - scoped inside service)
router.get('/', validate(taskQuerySchema, 'query'), (req, res, next) => {
  taskController.listTasks(req, res, next);
});

// Get task by ID (All roles - scoped inside service)
router.get('/:id', (req, res, next) => {
  taskController.getTaskById(req, res, next);
});

// Update task status (All roles - Developer can ONLY change status of own task)
router.patch('/:id/status', validate(updateTaskStatusSchema), (req, res, next) => {
  taskController.updateTaskStatus(req, res, next);
});

// Create task (Admin & PM only)
router.post(
  '/',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  validate(createTaskSchema),
  (req, res, next) => {
    taskController.createTask(req, res, next);
  }
);

// Full task update (Admin & PM only)
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  validate(updateTaskSchema),
  (req, res, next) => {
    taskController.updateTask(req, res, next);
  }
);

// Delete task (Admin & PM only)
router.delete(
  '/:id',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  (req, res, next) => {
    taskController.deleteTask(req, res, next);
  }
);

export default router;
