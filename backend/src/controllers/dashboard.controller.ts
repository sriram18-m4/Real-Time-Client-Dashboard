import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service.js';

export class DashboardController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getDashboardData(req.user!);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
