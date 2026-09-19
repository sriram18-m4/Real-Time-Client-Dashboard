import { prisma, isDatabaseConnected } from '../db/prisma.js';
import { memoryDb } from '../db/memoryStore.js';
import { TaskActivity } from '@prisma/client';

export class ActivityRepository {
  async findManyRoleScoped(params: {
    role: 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
    userId: string;
    projectIds?: string[];
    taskIds?: number[];
    cursor?: string;
    limit?: number;
    since?: Date;
  }): Promise<{ activities: any[]; nextCursor: string | null }> {
    const { role, projectIds = [], taskIds = [], cursor, limit = 20, since } = params;

    if (isDatabaseConnected()) {
      try {
        const where: any = {};

        // Role-scoped filtering
        if (role === 'PROJECT_MANAGER') {
          where.projectId = { in: projectIds };
        } else if (role === 'DEVELOPER') {
          where.taskId = { in: taskIds };
        }
        // ADMIN has no where filter on scope

        if (since) {
          where.createdAt = { gt: since };
        }

        if (cursor) {
          where.createdAt = {
            ...(where.createdAt || {}),
            lt: new Date(cursor),
          };
        }

        const activities = await prisma.taskActivity.findMany({
          where,
          take: limit + 1,
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: { id: true, name: true, role: true, email: true },
            },
            task: {
              select: { id: true, title: true, status: true, priority: true },
            },
            project: {
              select: { id: true, name: true },
            },
          },
        });

        let nextCursor: string | null = null;
        if (activities.length > limit) {
          const nextItem = activities.pop();
          if (nextItem) nextCursor = nextItem.createdAt.toISOString();
        }

        return { activities, nextCursor };
      } catch {
        // Fallback
      }
    }

    let filtered = [...memoryDb.activities];

    if (role === 'PROJECT_MANAGER') {
      filtered = filtered.filter((a) => projectIds.includes(a.projectId));
    } else if (role === 'DEVELOPER') {
      filtered = filtered.filter((a) => taskIds.includes(a.taskId));
    }

    if (since) {
      filtered = filtered.filter((a) => new Date(a.createdAt) > since);
    }

    if (cursor) {
      const cursorDate = new Date(cursor);
      filtered = filtered.filter((a) => new Date(a.createdAt) < cursorDate);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let nextCursor: string | null = null;
    if (filtered.length > limit) {
      const nextItem = filtered[limit];
      nextCursor = new Date(nextItem.createdAt).toISOString();
    }

    const sliced = filtered.slice(0, limit);

    const formatted = sliced.map((a) => {
      const actor = a.actorId ? memoryDb.users.find((u) => u.id === a.actorId) : null;
      const task = memoryDb.tasks.find((t) => t.id === a.taskId);
      const project = memoryDb.projects.find((p) => p.id === a.projectId);
      return {
        ...a,
        actor: actor ? { id: actor.id, name: actor.name, role: actor.role, email: actor.email } : null,
        task: task ? { id: task.id, title: task.title, status: task.status, priority: task.priority } : null,
        project: project ? { id: project.id, name: project.name } : null,
      };
    });

    return { activities: formatted, nextCursor };
  }

  async findByTaskId(taskId: number): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.taskActivity.findMany({
          where: { taskId },
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: { id: true, name: true, role: true },
            },
          },
        });
      } catch {
        // Fallback
      }
    }

    return memoryDb.activities
      .filter((a) => a.taskId === taskId)
      .map((a) => ({
        ...a,
        actor: a.actorId ? memoryDb.users.find((u) => u.id === a.actorId) : null,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const activityRepository = new ActivityRepository();
