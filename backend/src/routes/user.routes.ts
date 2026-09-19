import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createUserSchema, updateUserSchema, userQuerySchema } from '../validations/user.validation.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// GET /api/users/developers - List developers assignable to tasks (ADMIN and PM)
router.get(
  '/developers',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  (req, res, next) => {
    userController.listAssignableDevelopers(req, res, next);
  }
);

// GET /api/users - Admin and PM list users
router.get(
  '/',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  validate(userQuerySchema, 'query'),
  (req, res, next) => {
    userController.listUsers(req, res, next);
  }
);

// GET /api/users/:id - Admin and PM get user
router.get(
  '/:id',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  (req, res, next) => {
    userController.getUserById(req, res, next);
  }
);

// POST /api/users - Admin only create user
router.post(
  '/',
  authorize(Role.ADMIN),
  validate(createUserSchema),
  (req, res, next) => {
    userController.createUser(req, res, next);
  }
);

// PATCH /api/users/:id - Admin only update user
router.patch(
  '/:id',
  authorize(Role.ADMIN),
  validate(updateUserSchema),
  (req, res, next) => {
    userController.updateUser(req, res, next);
  }
);

export default router;
