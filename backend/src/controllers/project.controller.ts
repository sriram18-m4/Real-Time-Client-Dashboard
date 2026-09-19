import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';

export class ProjectController {
  async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectService.listProjects(req.user!, {
        clientId: req.query.clientId as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.getProjectById(req.params.id, req.user!);
      res.status(200).json({ project });
    } catch (error) {
      next(error);
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.createProject(req.user!, req.body);
      res.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.updateProject(req.params.id, req.user!, req.body);
      res.status(200).json({ project });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.deleteProject(req.params.id, req.user!);
      res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
