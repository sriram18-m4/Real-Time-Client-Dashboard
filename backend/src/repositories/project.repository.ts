import { prisma, isDatabaseConnected } from '../db/prisma.js';
import { memoryDb, MemoryProject } from '../db/memoryStore.js';
import { Project } from '@prisma/client';

export class ProjectRepository {
  async findById(id: string): Promise<(Project & { client?: any; creator?: any; tasks?: any[]; _count?: any }) | null> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.project.findUnique({
          where: { id },
          include: {
            client: true,
            creator: {
              select: { id: true, name: true, email: true, role: true },
            },
            tasks: {
              include: {
                assignee: {
                  select: { id: true, name: true, email: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      } catch {
        // Fallback
      }
    }
    const p = memoryDb.projects.find((item) => item.id === id);
    if (!p) return null;
    const client = memoryDb.clients.find((c) => c.id === p.clientId);
    const creator = memoryDb.users.find((u) => u.id === p.createdById);
    const tasks = memoryDb.tasks
      .filter((t) => t.projectId === p.id)
      .map((t) => ({
        ...t,
        assignee: memoryDb.users.find((u) => u.id === t.assigneeId) || null,
      }));

    return {
      ...p,
      client,
      creator: creator
        ? { id: creator.id, name: creator.name, email: creator.email, role: creator.role }
        : null,
      tasks,
    } as any;
  }

  async findMany(params: {
    createdById?: string;
    clientId?: string;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ projects: any[]; total: number }> {
    const { createdById, clientId, search, skip = 0, take = 50 } = params;

    if (isDatabaseConnected()) {
      try {
        const where: any = {};
        if (createdById) where.createdById = createdById;
        if (clientId) where.clientId = clientId;
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [projects, total] = await Promise.all([
          prisma.project.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
              client: true,
              creator: {
                select: { id: true, name: true, email: true, role: true },
              },
              _count: {
                select: { tasks: true },
              },
            },
          }),
          prisma.project.count({ where }),
        ]);

        const formatted = projects.map((p) => ({
          ...p,
          taskCount: p._count.tasks,
        }));

        return { projects: formatted, total };
      } catch {
        // Fallback
      }
    }

    let filtered = [...memoryDb.projects];
    if (createdById) filtered = filtered.filter((p) => p.createdById === createdById);
    if (clientId) filtered = filtered.filter((p) => p.clientId === clientId);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    const total = filtered.length;
    const sliced = filtered.slice(skip, skip + take);

    const formatted = sliced.map((p) => {
      const client = memoryDb.clients.find((c) => c.id === p.clientId);
      const creator = memoryDb.users.find((u) => u.id === p.createdById);
      const taskCount = memoryDb.tasks.filter((t) => t.projectId === p.id).length;
      return {
        ...p,
        client,
        creator: creator
          ? { id: creator.id, name: creator.name, email: creator.email, role: creator.role }
          : null,
        taskCount,
      };
    });

    return { projects: formatted, total };
  }

  async create(data: {
    name: string;
    description?: string;
    clientId: string;
    createdById: string;
  }): Promise<Project> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.project.create({ data });
      } catch {
        // Fallback
      }
    }
    const newProject: MemoryProject = {
      id: `prj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name,
      description: data.description || null,
      clientId: data.clientId,
      createdById: data.createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryDb.projects.push(newProject);
    return newProject as unknown as Project;
  }

  async update(id: string, data: Partial<{ name: string; description: string; clientId: string }>): Promise<Project> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.project.update({
          where: { id },
          data,
        });
      } catch {
        // Fallback
      }
    }
    const idx = memoryDb.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Project not found');
    memoryDb.projects[idx] = {
      ...memoryDb.projects[idx],
      ...data,
      updatedAt: new Date(),
    };
    return memoryDb.projects[idx] as unknown as Project;
  }

  async delete(id: string): Promise<void> {
    if (isDatabaseConnected()) {
      try {
        await prisma.project.delete({ where: { id } });
        return;
      } catch {
        // Fallback
      }
    }
    memoryDb.projects = memoryDb.projects.filter((p) => p.id !== id);
    memoryDb.tasks = memoryDb.tasks.filter((t) => t.projectId !== id);
    memoryDb.activities = memoryDb.activities.filter((a) => a.projectId !== id);
  }
}

export const projectRepository = new ProjectRepository();
