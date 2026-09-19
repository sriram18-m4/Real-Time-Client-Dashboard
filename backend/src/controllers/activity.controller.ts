import { Request, Response, NextFunction } from 'express';
import { activityService } from '../services/activity.service.js';

export class ActivityController {
  async getActivityFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await activityService.getActivityFeed(req.user!, {
        cursor: req.query.cursor as string,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMissedActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await activityService.getMissedActivities(req.user!);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const activityController = new ActivityController();
