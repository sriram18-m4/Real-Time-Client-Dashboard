import { Router } from 'express';
import { clientController } from '../controllers/client.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createClientSchema, updateClientSchema, clientQuerySchema } from '../validations/client.validation.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// List clients (Admin & Project Manager; Developer is forbidden 403)
router.get('/', authorize(Role.ADMIN, Role.PROJECT_MANAGER), validate(clientQuerySchema, 'query'), (req, res, next) => {
  clientController.listClients(req, res, next);
});

// Get client by ID (Admin & Project Manager)
router.get('/:id', authorize(Role.ADMIN, Role.PROJECT_MANAGER), (req, res, next) => {
  clientController.getClientById(req, res, next);
});

// Create client (Admin & Project Manager)
router.post('/', authorize(Role.ADMIN, Role.PROJECT_MANAGER), validate(createClientSchema), (req, res, next) => {
  clientController.createClient(req, res, next);
});

// Update client (Admin & Project Manager)
router.patch('/:id', authorize(Role.ADMIN, Role.PROJECT_MANAGER), validate(updateClientSchema), (req, res, next) => {
  clientController.updateClient(req, res, next);
});

// Delete client (Admin only)
router.delete('/:id', authorize(Role.ADMIN), (req, res, next) => {
  clientController.deleteClient(req, res, next);
});

export default router;
