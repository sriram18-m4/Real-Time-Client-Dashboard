import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createProjectSchema, updateProjectSchema, projectQuerySchema } from '../validations/project.validation.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// List projects (Admin & PM only; Developers 403)
router.get(
  '/',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  validate(projectQuerySchema, 'query'),
  (req, res, next) => {
    projectController.listProjects(req, res, next);
  }
);

// Get single project
router.get(
  '/:id',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  (req, res, next) => {
    projectController.getProjectById(req, res, next);
  }
);

// Create project
router.post(
  '/',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  validate(createProjectSchema),
  (req, res, next) => {
    projectController.createProject(req, res, next);
  }
);

// Update project
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.PROJECT_MANAGER),
  validate(updateProjectSchema),
  (req, res, next) => {
    projectController.updateProject(req, res, next);
  }
);

// Delete project (Admin only)
router.delete(
  '/:id',
  authorize(Role.ADMIN),
  (req, res, next) => {
    projectController.deleteProject(req, res, next);
  }
);

export default router;
