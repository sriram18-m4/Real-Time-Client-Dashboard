import { projectRepository } from '../repositories/project.repository.js';
import { clientRepository } from '../repositories/client.repository.js';
import { AppError } from '../errors/AppError.js';
import { Role, User, Project } from '@prisma/client';

export class ProjectService {
  async listProjects(
    user: User,
    params: {
      clientId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ projects: any[]; total: number; page: number; totalPages: number }> {
    // Developers cannot access projects
    if (user.role === Role.DEVELOPER) {
      throw AppError.forbidden('Developers cannot list projects', 'FORBIDDEN_PROJECT_ACCESS');
    }

    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    // PM only sees projects created by them
    const createdById = user.role === Role.PROJECT_MANAGER ? user.id : undefined;

    const { projects, total } = await projectRepository.findMany({
      createdById,
      clientId: params.clientId,
      search: params.search,
      skip,
      take: limit,
    });

    return {
      projects,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getProjectById(id: string, user: User): Promise<any> {
    // Developers cannot access projects
    if (user.role === Role.DEVELOPER) {
      throw AppError.forbidden('Developers cannot access projects', 'FORBIDDEN_PROJECT_ACCESS');
    }

    const project = await projectRepository.findById(id);
    if (!project) {
      throw AppError.notFound(`Project with ID ${id} not found`, 'PROJECT_NOT_FOUND');
    }

    // PM ownership check: If PM is not creator, return 404 so existence is not leaked
    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.id) {
      throw AppError.notFound(`Project with ID ${id} not found`, 'PROJECT_NOT_FOUND');
    }

    return project;
  }

  async createProject(
    user: User,
    data: {
      name: string;
      description?: string;
      clientId: string;
    }
  ): Promise<Project> {
    if (user.role === Role.DEVELOPER) {
      throw AppError.forbidden('Developers cannot create projects', 'FORBIDDEN_PROJECT_CREATE');
    }

    const client = await clientRepository.findById(data.clientId);
    if (!client) {
      throw AppError.badRequest(`Client with ID ${data.clientId} not found`, 'INVALID_CLIENT_ID');
    }

    return await projectRepository.create({
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      createdById: user.id, // Always assigned to current creator
    });
  }

  async updateProject(
    id: string,
    user: User,
    data: {
      name?: string;
      description?: string;
      clientId?: string;
    }
  ): Promise<Project> {
    if (user.role === Role.DEVELOPER) {
      throw AppError.forbidden('Developers cannot update projects', 'FORBIDDEN_PROJECT_UPDATE');
    }

    const project = await projectRepository.findById(id);
    if (!project) {
      throw AppError.notFound(`Project with ID ${id} not found`, 'PROJECT_NOT_FOUND');
    }

    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.id) {
      throw AppError.notFound(`Project with ID ${id} not found`, 'PROJECT_NOT_FOUND');
    }

    if (data.clientId) {
      const client = await clientRepository.findById(data.clientId);
      if (!client) {
        throw AppError.badRequest(`Client with ID ${data.clientId} not found`, 'INVALID_CLIENT_ID');
      }
    }

    return await projectRepository.update(id, data);
  }

  async deleteProject(id: string, user: User): Promise<void> {
    if (user.role !== Role.ADMIN) {
      throw AppError.forbidden('Only Administrators can delete projects', 'FORBIDDEN_PROJECT_DELETE');
    }

    const project = await projectRepository.findById(id);
    if (!project) {
      throw AppError.notFound(`Project with ID ${id} not found`, 'PROJECT_NOT_FOUND');
    }

    await projectRepository.delete(id);
  }
}

export const projectService = new ProjectService();
