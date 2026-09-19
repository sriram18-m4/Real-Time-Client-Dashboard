import { prisma, isDatabaseConnected } from '../db/prisma.js';
import { memoryDb, MemoryTask, MemoryTaskActivity } from '../db/memoryStore.js';
import { Task, TaskStatus, TaskPriority, ActivityType } from '@prisma/client';

export class TaskRepository {
  async findById(id: number): Promise<(Task & { project?: any; assignee?: any }) | null> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.task.findUnique({
          where: { id },
          include: {
            project: {
              include: {
                client: true,
                creator: {
                  select: { id: true, name: true, email: true, role: true },
                },
              },
            },
            assignee: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });
      } catch {
        // Fallback
      }
    }

    const t = memoryDb.tasks.find((task) => task.id === id);
    if (!t) return null;
    const project = memoryDb.projects.find((p) => p.id === t.projectId);
    const client = project ? memoryDb.clients.find((c) => c.id === project.clientId) : null;
    const creator = project ? memoryDb.users.find((u) => u.id === project.createdById) : null;
    const assignee = t.assigneeId ? memoryDb.users.find((u) => u.id === t.assigneeId) : null;

    return {
      ...t,
      project: project ? { ...project, client, creator } : null,
      assignee,
    } as any;
  }

  async findMany(params: {
    projectId?: string;
    projectIds?: string[];
    assigneeId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueFrom?: Date;
    dueTo?: Date;
    isOverdue?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ tasks: any[]; total: number }> {
    const {
      projectId,
      projectIds,
      assigneeId,
      status,
      priority,
      dueFrom,
      dueTo,
      isOverdue,
      search,
      skip = 0,
      take = 50,
    } = params;

    if (isDatabaseConnected()) {
      try {
        const where: any = {};
        if (projectId) where.projectId = projectId;
        if (projectIds && projectIds.length > 0) where.projectId = { in: projectIds };
        if (assigneeId) where.assigneeId = assigneeId;
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (typeof isOverdue === 'boolean') where.isOverdue = isOverdue;

        if (dueFrom || dueTo) {
          where.dueDate = {};
          if (dueFrom) where.dueDate.gte = dueFrom;
          if (dueTo) where.dueDate.lte = dueTo;
        }

        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [tasks, total] = await Promise.all([
          prisma.task.findMany({
            where,
            skip,
            take,
            orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
            include: {
              project: {
                select: { id: true, name: true, createdById: true },
              },
              assignee: {
                select: { id: true, name: true, email: true },
              },
            },
          }),
          prisma.task.count({ where }),
        ]);

        return { tasks, total };
      } catch {
        // Fallback
      }
    }

    let filtered = [...memoryDb.tasks];

    if (projectId) filtered = filtered.filter((t) => t.projectId === projectId);
    if (projectIds && projectIds.length > 0) filtered = filtered.filter((t) => projectIds.includes(t.projectId));
    if (assigneeId) filtered = filtered.filter((t) => t.assigneeId === assigneeId);
    if (status) filtered = filtered.filter((t) => t.status === status);
    if (priority) filtered = filtered.filter((t) => t.priority === priority);
    if (typeof isOverdue === 'boolean') filtered = filtered.filter((t) => t.isOverdue === isOverdue);

    if (dueFrom) filtered = filtered.filter((t) => new Date(t.dueDate) >= dueFrom);
    if (dueTo) filtered = filtered.filter((t) => new Date(t.dueDate) <= dueTo);

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;

    // Sort priority Critical -> High -> Medium -> Low, then dueDate asc
    const priorityOrder: Record<TaskPriority, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    filtered.sort((a, b) => {
      const pDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const sliced = filtered.slice(skip, skip + take);

    const formatted = sliced.map((t) => {
      const project = memoryDb.projects.find((p) => p.id === t.projectId);
      const assignee = t.assigneeId ? memoryDb.users.find((u) => u.id === t.assigneeId) : null;
      return {
        ...t,
        project: project
          ? { id: project.id, name: project.name, createdById: project.createdById }
          : null,
        assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : null,
      };
    });

    return { tasks: formatted, total };
  }

  /**
   * Updates task and records TaskActivity in the SAME atomic transaction
   */
  async updateStatusWithActivity(params: {
    taskId: number;
    newStatus: TaskStatus;
    actorId: string | null;
    actorName: string;
  }): Promise<{ task: Task; activity: any }> {
    const { taskId, newStatus, actorId, actorName } = params;

    const taskBefore = await this.findById(taskId);
    if (!taskBefore) {
      throw new Error(`Task #${taskId} not found`);
    }

    const oldStatus = taskBefore.status;
    const now = new Date();

    let isOverdue = taskBefore.isOverdue;
    let overdueAt = taskBefore.overdueAt;

    if (newStatus === TaskStatus.DONE) {
      isOverdue = false;
      overdueAt = null;
    } else if (new Date(taskBefore.dueDate) < now) {
      isOverdue = true;
      overdueAt = overdueAt || now;
    }

    const activityMessage = `${actorName} changed status from "${this.formatStatus(oldStatus)}" to "${this.formatStatus(newStatus)}"`;

    if (isDatabaseConnected()) {
      try {
        const [updatedTask, createdActivity] = await prisma.$transaction([
          prisma.task.update({
            where: { id: taskId },
            data: {
              status: newStatus,
              isOverdue,
              overdueAt,
              updatedAt: now,
            },
            include: {
              project: {
                include: {
                  creator: { select: { id: true, name: true } },
                },
              },
              assignee: { select: { id: true, name: true, email: true } },
            },
          }),
          prisma.taskActivity.create({
            data: {
              taskId,
              projectId: taskBefore.projectId,
              actorId,
              type: ActivityType.STATUS_CHANGED,
              fromStatus: oldStatus,
              toStatus: newStatus,
              message: activityMessage,
              createdAt: now,
            },
            include: {
              actor: { select: { id: true, name: true, role: true } },
              task: { select: { id: true, title: true } },
              project: { select: { id: true, name: true } },
            },
          }),
        ]);

        return { task: updatedTask, activity: createdActivity };
      } catch {
        // Fallback
      }
    }

    // In-memory atomic transaction simulation
    const idx = memoryDb.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error(`Task #${taskId} not found`);

    memoryDb.tasks[idx] = {
      ...memoryDb.tasks[idx],
      status: newStatus,
      isOverdue,
      overdueAt,
      updatedAt: now,
    };

    const newAct: MemoryTaskActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      projectId: taskBefore.projectId,
      actorId,
      type: ActivityType.STATUS_CHANGED,
      fromStatus: oldStatus,
      toStatus: newStatus,
      message: activityMessage,
      createdAt: now,
    };

    memoryDb.activities.unshift(newAct);

    const project = memoryDb.projects.find((p) => p.id === taskBefore.projectId);
    const creator = project ? memoryDb.users.find((u) => u.id === project.createdById) : null;
    const assignee = memoryDb.tasks[idx].assigneeId
      ? memoryDb.users.find((u) => u.id === memoryDb.tasks[idx].assigneeId)
      : null;
    const actor = actorId ? memoryDb.users.find((u) => u.id === actorId) : null;

    return {
      task: {
        ...memoryDb.tasks[idx],
        project: project ? { ...project, creator } : null,
        assignee,
      } as unknown as Task,
      activity: {
        ...newAct,
        actor: actor ? { id: actor.id, name: actor.name, role: actor.role } : null,
        task: { id: taskId, title: memoryDb.tasks[idx].title },
        project: project ? { id: project.id, name: project.name } : null,
      },
    };
  }

  async create(data: {
    projectId: string;
    assigneeId?: string | null;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date;
    actorId?: string;
    actorName?: string;
  }): Promise<{ task: Task; activity: any }> {
    const now = new Date();
    const isOverdue = data.dueDate < now && data.status !== TaskStatus.DONE;
    const overdueAt = isOverdue ? data.dueDate : null;

    if (isDatabaseConnected()) {
      try {
        const created = await prisma.task.create({
          data: {
            projectId: data.projectId,
            assigneeId: data.assigneeId || null,
            title: data.title,
            description: data.description || null,
            status: data.status,
            priority: data.priority,
            dueDate: data.dueDate,
            isOverdue,
            overdueAt,
          },
          include: {
            project: true,
            assignee: true,
          },
        });

        const activity = await prisma.taskActivity.create({
          data: {
            taskId: created.id,
            projectId: data.projectId,
            actorId: data.actorId || null,
            type: ActivityType.CREATED,
            toStatus: data.status,
            message: `${data.actorName || 'User'} created Task #${created.id}: "${data.title}"`,
          },
        });

        return { task: created, activity };
      } catch {
        // Fallback
      }
    }

    const newId = memoryDb.getNextTaskId();
    const newTask: MemoryTask = {
      id: newId,
      projectId: data.projectId,
      assigneeId: data.assigneeId || null,
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate,
      isOverdue,
      overdueAt,
      createdAt: now,
      updatedAt: now,
    };
    memoryDb.tasks.push(newTask);

    const newActivity: MemoryTaskActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId: newId,
      projectId: data.projectId,
      actorId: data.actorId || null,
      type: ActivityType.CREATED,
      fromStatus: null,
      toStatus: data.status,
      message: `${data.actorName || 'User'} created Task #${newId}: "${data.title}"`,
      createdAt: now,
    };
    memoryDb.activities.unshift(newActivity);

    const project = memoryDb.projects.find((p) => p.id === data.projectId);
    const creator = project ? memoryDb.users.find((u) => u.id === project.createdById) : null;
    const assignee = data.assigneeId ? memoryDb.users.find((u) => u.id === data.assigneeId) : null;

    return {
      task: {
        ...newTask,
        project: project ? { ...project, creator } : null,
        assignee,
      } as unknown as Task,
      activity: newActivity,
    };
  }

  async update(id: number, data: Partial<{
    projectId: string;
    assigneeId: string | null;
    title: string;
    description: string | null;
    priority: TaskPriority;
    dueDate: Date;
    status: TaskStatus;
  }>, actorId?: string, actorName?: string): Promise<{ task: Task; activity?: any }> {
    const current = await this.findById(id);
    if (!current) throw new Error(`Task #${id} not found`);

    const now = new Date();
    const newDueDate = data.dueDate || current.dueDate;
    const newStatus = data.status || current.status;
    let isOverdue = current.isOverdue;
    let overdueAt = current.overdueAt;

    // Reset overdue flag if due date extended into future or status set to DONE
    if ((newStatus as string) === 'DONE' || newDueDate > now) {
      isOverdue = false;
      overdueAt = null;
    } else if (newDueDate < now && (newStatus as string) !== 'DONE') {
      isOverdue = true;
      overdueAt = overdueAt || now;
    }

    if (isDatabaseConnected()) {
      try {
        const updated = await prisma.task.update({
          where: { id },
          data: {
            ...data,
            isOverdue,
            overdueAt,
          },
          include: {
            project: {
              include: { creator: true },
            },
            assignee: true,
          },
        });

        let activity: any = null;
        if (data.assigneeId !== undefined && data.assigneeId !== current.assigneeId) {
          const assignedUser = data.assigneeId ? await prisma.user.findUnique({ where: { id: data.assigneeId } }) : null;
          activity = await prisma.taskActivity.create({
            data: {
              taskId: id,
              projectId: current.projectId,
              actorId: actorId || null,
              type: ActivityType.ASSIGNED,
              message: `${actorName || 'User'} assigned Task #${id} to ${assignedUser ? assignedUser.name : 'Unassigned'}`,
            },
          });
        }

        return { task: updated, activity };
      } catch {
        // Fallback
      }
    }

    const idx = memoryDb.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task #${id} not found`);

    memoryDb.tasks[idx] = {
      ...memoryDb.tasks[idx],
      ...data,
      isOverdue,
      overdueAt,
      updatedAt: now,
    };

    let activity: any = null;
    if (data.assigneeId !== undefined && data.assigneeId !== current.assigneeId) {
      const assignedUser = data.assigneeId ? memoryDb.users.find((u) => u.id === data.assigneeId) : null;
      activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        taskId: id,
        projectId: current.projectId,
        actorId: actorId || null,
        type: ActivityType.ASSIGNED,
        fromStatus: null,
        toStatus: null,
        message: `${actorName || 'User'} assigned Task #${id} to ${assignedUser ? assignedUser.name : 'Unassigned'}`,
        createdAt: now,
      };
      memoryDb.activities.unshift(activity);
    }

    const project = memoryDb.projects.find((p) => p.id === current.projectId);
    const creator = project ? memoryDb.users.find((u) => u.id === project.createdById) : null;
    const assignee = memoryDb.tasks[idx].assigneeId
      ? memoryDb.users.find((u) => u.id === memoryDb.tasks[idx].assigneeId)
      : null;

    return {
      task: {
        ...memoryDb.tasks[idx],
        project: project ? { ...project, creator } : null,
        assignee,
      } as unknown as Task,
      activity,
    };
  }

  async delete(id: number): Promise<void> {
    if (isDatabaseConnected()) {
      try {
        await prisma.task.delete({ where: { id } });
        return;
      } catch {
        // Fallback
      }
    }
    memoryDb.tasks = memoryDb.tasks.filter((t) => t.id !== id);
    memoryDb.activities = memoryDb.activities.filter((a) => a.taskId !== id);
    memoryDb.notifications = memoryDb.notifications.filter((n) => n.taskId !== id);
  }

  /**
   * Overdue Scanner for background cron job
   */
  async findTasksNeedingOverdueFlag(now: Date): Promise<Task[]> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.task.findMany({
          where: {
            dueDate: { lt: now },
            status: { not: TaskStatus.DONE },
            isOverdue: false,
          },
          include: {
            project: true,
            assignee: true,
          },
        });
      } catch {
        // Fallback
      }
    }

    return memoryDb.tasks.filter(
      (t) => new Date(t.dueDate) < now && (t.status as string) !== 'DONE' && !t.isOverdue
    ) as unknown as Task[];
  }

  async flagTaskOverdue(taskId: number, timestamp: Date): Promise<any> {
    const task = await this.findById(taskId);
    if (!task) return null;

    const message = `System flagged Task #${taskId} as Overdue (past deadline)`;

    if (isDatabaseConnected()) {
      try {
        const [updatedTask, activity] = await prisma.$transaction([
          prisma.task.update({
            where: { id: taskId },
            data: {
              isOverdue: true,
              overdueAt: timestamp,
            },
            include: {
              project: { include: { creator: true } },
              assignee: true,
            },
          }),
          prisma.taskActivity.create({
            data: {
              taskId,
              projectId: task.projectId,
              actorId: null, // System event
              type: ActivityType.OVERDUE_FLAGGED,
              message,
              createdAt: timestamp,
            },
          }),
        ]);

        return { task: updatedTask, activity };
      } catch {
        // Fallback
      }
    }

    const idx = memoryDb.tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      memoryDb.tasks[idx].isOverdue = true;
      memoryDb.tasks[idx].overdueAt = timestamp;
    }

    const activity: MemoryTaskActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      projectId: task.projectId,
      actorId: null,
      type: ActivityType.OVERDUE_FLAGGED,
      fromStatus: null,
      toStatus: null,
      message,
      createdAt: timestamp,
    };
    memoryDb.activities.unshift(activity);

    return { task: memoryDb.tasks[idx], activity };
  }

  private formatStatus(s: TaskStatus): string {
    switch (s) {
      case TaskStatus.TODO:
        return 'Todo';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.IN_REVIEW:
        return 'In Review';
      case TaskStatus.DONE:
        return 'Done';
      default:
        return s;
    }
  }
}

export const taskRepository = new TaskRepository();
