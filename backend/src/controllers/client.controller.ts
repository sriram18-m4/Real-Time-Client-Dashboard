import { Request, Response, NextFunction } from 'express';
import { clientService } from '../services/client.service.js';

export class ClientController {
  async listClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await clientService.listClients({
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getClientById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.getClientById(req.params.id);
      res.status(200).json({ client });
    } catch (error) {
      next(error);
    }
  }

  async createClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.createClient(req.body);
      res.status(201).json({ client });
    } catch (error) {
      next(error);
    }
  }

  async updateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.updateClient(req.params.id, req.body);
      res.status(200).json({ client });
    } catch (error) {
      next(error);
    }
  }

  async deleteClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await clientService.deleteClient(req.params.id);
      res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const clientController = new ClientController();
