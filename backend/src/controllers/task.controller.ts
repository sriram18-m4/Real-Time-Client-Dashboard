import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service.js';

export class TaskController {
  async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.listTasks(req.user!, {
        projectId: req.query.projectId as string,
        assigneeId: req.query.assigneeId as string,
        status: req.query.status as any,
        priority: req.query.priority as any,
        dueFrom: req.query.dueFrom as string,
        dueTo: req.query.dueTo as string,
        isOverdue: req.query.isOverdue as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.getTaskById(Number(req.params.id), req.user!);
      res.status(200).json({ task });
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.createTask(req.user!, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.updateTask(Number(req.params.id), req.user!, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateTaskStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.updateTaskStatus(
        Number(req.params.id),
        req.user!,
        req.body.status
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await taskService.deleteTask(Number(req.params.id), req.user!);
      res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
