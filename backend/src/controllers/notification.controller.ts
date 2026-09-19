import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service.js';

export class NotificationController {
  async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.listNotifications(req.user!, {
        unreadOnly: req.query.unreadOnly !== undefined ? req.query.unreadOnly === 'true' : false,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAsRead(req.params.id, req.user!);
      res.status(200).json({ notification: result });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAllAsRead(req.user!);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
