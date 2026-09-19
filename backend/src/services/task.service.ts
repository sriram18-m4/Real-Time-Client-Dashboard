import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { socketManager } from '../socket/socketServer.js';
import { AppError } from '../errors/AppError.js';
import { Role, User, Task, TaskStatus, TaskPriority, NotificationType } from '@prisma/client';
import { logger } from '../logger/logger.js';

export class TaskService {
  async listTasks(
    user: User,
    params: {
      projectId?: string;
      assigneeId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueFrom?: string;
      dueTo?: string;
      isOverdue?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ tasks: any[]; total: number; page: number; totalPages: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    let targetAssigneeId = params.assigneeId;
    let targetProjectId = params.projectId;
    let targetProjectIds: string[] | undefined;

    // 1. Developer: strictly forced to their own assigned tasks
    if (user.role === Role.DEVELOPER) {
      targetAssigneeId = user.id;
    }

    // 2. Project Manager: strictly forced to tasks within projects created by them
    if (user.role === Role.PROJECT_MANAGER) {
      if (targetProjectId) {
        // Verify PM owns this requested project
        const prj = await projectRepository.findById(targetProjectId);
        if (!prj || prj.createdById !== user.id) {
          throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
        }
      } else {
        // Query all projects created by this PM
        const { projects } = await projectRepository.findMany({ createdById: user.id });
        targetProjectIds = projects.map((p) => p.id);
      }
    }

    const { tasks, total } = await taskRepository.findMany({
      projectId: targetProjectId,
      projectIds: targetProjectIds,
      assigneeId: targetAssigneeId,
      status: params.status,
      priority: params.priority,
      dueFrom: params.dueFrom ? new Date(params.dueFrom) : undefined,
      dueTo: params.dueTo ? new Date(params.dueTo) : undefined,
      isOverdue: params.isOverdue !== undefined ? params.isOverdue === 'true' : undefined,
      search: params.search,
      skip,
      take: limit,
    });

    return {
      tasks,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getTaskById(id: number, user: User): Promise<any> {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
    }

    // RBAC:
    // Developer can only view if assigned to them
    if (user.role === Role.DEVELOPER) {
      if (task.assigneeId !== user.id) {
        throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
      }
    }

    // PM can only view if task belongs to their created project
    if (user.role === Role.PROJECT_MANAGER) {
      const project = await projectRepository.findById(task.projectId);
      if (!project || project.createdById !== user.id) {
        throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
      }
    }

    return task;
  }

  /**
   * Status change endpoint:
   * Accessible by Admin, PM (own projects), and Developer (own assigned tasks)
   */
  async updateTaskStatus(id: number, user: User, newStatus: TaskStatus): Promise<{ task: Task; activity: any }> {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
    }

    const project = await projectRepository.findById(task.projectId);
    if (!project) {
      throw AppError.notFound(`Task #${id} not found`, 'PROJECT_NOT_FOUND');
    }

    // Authorization checks:
    if (user.role === Role.DEVELOPER) {
      // Developer can ONLY update status of their OWN assigned task
      if (task.assigneeId !== user.id) {
        throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
      }
    } else if (user.role === Role.PROJECT_MANAGER) {
      // PM can only update status within their own project
      if (project.createdById !== user.id) {
        throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
      }
    }

    const oldStatus = task.status;

    // Perform atomic transaction: update task status + create TaskActivity row
    const { task: updatedTask, activity } = await taskRepository.updateStatusWithActivity({
      taskId: id,
      newStatus,
      actorId: user.id,
      actorName: user.name,
    });

    // Format human-readable live event payload:
    // "Ravi moved Task #12 from In Progress → In Review · just now"
    const fromStr = this.formatStatus(oldStatus);
    const toStr = this.formatStatus(newStatus);
    const formattedText = `${user.name} moved Task #${id} from ${fromStr} → ${toStr} · just now`;

    // Compute audience server-side and emit real-time event
    socketManager.emitTaskActivity({
      activity: {
        id: activity.id,
        taskId: id,
        projectId: task.projectId,
        projectName: project.name,
        actorId: user.id,
        actorName: user.name,
        type: 'STATUS_CHANGED',
        fromStatus: oldStatus,
        toStatus: newStatus,
        message: activity.message || formattedText,
        createdAt: new Date().toISOString(),
        formattedText,
      },
      owningPmId: project.createdById,
      assigneeDevId: task.assigneeId,
    });

    // Notification rule: If task moved to IN_REVIEW, notify the project's PM
    if (newStatus === TaskStatus.IN_REVIEW && project.createdById) {
      try {
        const notif = await notificationRepository.create({
          userId: project.createdById,
          taskId: id,
          title: 'Task In Review',
          message: `${user.name} moved Task #${id} "${task.title}" to IN_REVIEW.`,
          type: NotificationType.TASK_IN_REVIEW,
        });

        const unreadCount = await notificationRepository.countUnread(project.createdById);
        socketManager.emitNotification(
          project.createdById,
          {
            id: notif.id,
            userId: notif.userId,
            taskId: id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            createdAt: notif.createdAt.toISOString(),
          },
          unreadCount
        );
      } catch (err) {
        logger.error({ err }, 'Failed to create IN_REVIEW notification');
      }
    }

    return { task: updatedTask, activity };
  }

  async createTask(
    user: User,
    data: {
      projectId: string;
      title: string;
      description?: string | null;
      assigneeId?: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: string;
    }
  ): Promise<{ task: Task; activity: any }> {
    // Developers cannot create tasks
    if (user.role === Role.DEVELOPER) {
      throw AppError.forbidden('Developers cannot create tasks', 'FORBIDDEN_TASK_CREATE');
    }

    const project = await projectRepository.findById(data.projectId);
    if (!project) {
      throw AppError.notFound(`Project with ID ${data.projectId} not found`, 'PROJECT_NOT_FOUND');
    }

    // PM ownership check
    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.id) {
      throw AppError.notFound(`Project with ID ${data.projectId} not found`, 'PROJECT_NOT_FOUND');
    }

    if (data.assigneeId) {
      const dev = await userRepository.findById(data.assigneeId);
      if (!dev || !dev.isActive) {
        throw AppError.badRequest('Assigned developer not found or inactive', 'INVALID_ASSIGNEE');
      }
    }

    const parsedDueDate = new Date(data.dueDate);

    const result = await taskRepository.create({
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      status: data.status,
      priority: data.priority,
      dueDate: parsedDueDate,
      actorId: user.id,
      actorName: user.name,
    });

    // Notify assigned developer if one was selected
    if (data.assigneeId) {
      try {
        const notif = await notificationRepository.create({
          userId: data.assigneeId,
          taskId: result.task.id,
          title: 'New Task Assigned',
          message: `${user.name} assigned you to Task #${result.task.id}: "${data.title}"`,
          type: NotificationType.TASK_ASSIGNED,
        });
        const unreadCount = await notificationRepository.countUnread(data.assigneeId);
        socketManager.emitNotification(
          data.assigneeId,
          {
            id: notif.id,
            userId: notif.userId,
            taskId: result.task.id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            createdAt: notif.createdAt.toISOString(),
          },
          unreadCount
        );
      } catch (err) {
        logger.error({ err }, 'Failed to dispatch task assignment notification');
      }
    }

    return result;
  }

  async updateTask(
    id: number,
    user: User,
    data: {
      title?: string;
      description?: string | null;
      assigneeId?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
    }
  ): Promise<{ task: Task; activity?: any }> {
    // Developers cannot do general task edits (only updateStatus)
    if (user.role === Role.DEVELOPER) {
      throw AppError.forbidden('Developers cannot update full task details', 'FORBIDDEN_TASK_EDIT');
    }

    const task = await taskRepository.findById(id);
    if (!task) {
      throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
    }

    const project = await projectRepository.findById(task.projectId);
    if (!project) {
      throw AppError.notFound(`Task #${id} not found`, 'PROJECT_NOT_FOUND');
    }

    // PM ownership check
    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.id) {
      throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
    }

    const updatePayload: any = {};
    if (data.title) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.assigneeId !== undefined) updatePayload.assigneeId = data.assigneeId;
    if (data.priority) updatePayload.priority = data.priority;
    if (data.status) updatePayload.status = data.status;
    if (data.dueDate) updatePayload.dueDate = new Date(data.dueDate);

    const result = await taskRepository.update(id, updatePayload, user.id, user.name);

    // If assigned to a new developer, notify them
    if (data.assigneeId && data.assigneeId !== task.assigneeId) {
      try {
        const notif = await notificationRepository.create({
          userId: data.assigneeId,
          taskId: id,
          title: 'Task Reassigned',
          message: `${user.name} assigned you to Task #${id}: "${result.task.title}"`,
          type: NotificationType.TASK_ASSIGNED,
        });
        const unreadCount = await notificationRepository.countUnread(data.assigneeId);
        socketManager.emitNotification(
          data.assigneeId,
          {
            id: notif.id,
            userId: notif.userId,
            taskId: id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            createdAt: notif.createdAt.toISOString(),
          },
          unreadCount
        );
      } catch (err) {
        logger.error({ err }, 'Failed to dispatch reassignment notification');
      }
    }

    return result;
  }

  async deleteTask(id: number, user: User): Promise<void> {
    if (user.role === Role.DEVELOPER) {
      throw AppError.forbidden('Developers cannot delete tasks', 'FORBIDDEN_TASK_DELETE');
    }

    const task = await taskRepository.findById(id);
    if (!task) {
      throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
    }

    const project = await projectRepository.findById(task.projectId);
    if (!project) {
      throw AppError.notFound(`Task #${id} not found`, 'PROJECT_NOT_FOUND');
    }

    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.id) {
      throw AppError.notFound(`Task #${id} not found`, 'TASK_NOT_FOUND');
    }

    await taskRepository.delete(id);
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

export const taskService = new TaskService();
