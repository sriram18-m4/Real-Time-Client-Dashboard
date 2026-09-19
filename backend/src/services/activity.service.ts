import { activityRepository } from '../repositories/activity.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { User, Role } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';

export class ActivityService {
  async getActivityFeed(
    user: User,
    params: {
      cursor?: string;
      limit?: number;
    }
  ): Promise<{ activities: any[]; nextCursor: string | null }> {
    const { cursor, limit = 20 } = params;

    let projectIds: string[] = [];
    let taskIds: number[] = [];

    if (user.role === Role.PROJECT_MANAGER) {
      const { projects } = await projectRepository.findMany({ createdById: user.id });
      projectIds = projects.map((p) => p.id);
    } else if (user.role === Role.DEVELOPER) {
      const { tasks } = await taskRepository.findMany({ assigneeId: user.id });
      taskIds = tasks.map((t) => t.id);
    }

    const { activities, nextCursor } = await activityRepository.findManyRoleScoped({
      role: user.role,
      userId: user.id,
      projectIds,
      taskIds,
      cursor,
      limit,
    });

    const formatted = activities.map((a) => this.formatActivity(a));

    return {
      activities: formatted,
      nextCursor,
    };
  }

  /**
   * Missed events catch-up from DATABASE using user's last_seen_at
   * Called on login and socket reconnect.
   */
  async getMissedActivities(user: User): Promise<{ activities: any[]; lastSeenAt: Date }> {
    const freshUser = await userRepository.findById(user.id);
    const lastSeenAt = freshUser?.lastSeenAt ? new Date(freshUser.lastSeenAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    let projectIds: string[] = [];
    let taskIds: number[] = [];

    if (user.role === Role.PROJECT_MANAGER) {
      const { projects } = await projectRepository.findMany({ createdById: user.id });
      projectIds = projects.map((p) => p.id);
    } else if (user.role === Role.DEVELOPER) {
      const { tasks } = await taskRepository.findMany({ assigneeId: user.id });
      taskIds = tasks.map((t) => t.id);
    }

    const { activities } = await activityRepository.findManyRoleScoped({
      role: user.role,
      userId: user.id,
      projectIds,
      taskIds,
      since: lastSeenAt,
      limit: 100,
    });

    const formatted = activities.map((a) => this.formatActivity(a));

    return {
      activities: formatted,
      lastSeenAt,
    };
  }

  private formatActivity(act: any): any {
    const actorName = act.actor ? act.actor.name : 'System';
    const createdAt = new Date(act.createdAt);
    const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

    let actionPart = act.message;
    if (act.type === 'STATUS_CHANGED' && act.fromStatus && act.toStatus) {
      actionPart = `${actorName} moved Task #${act.taskId} from ${this.prettifyStatus(act.fromStatus)} → ${this.prettifyStatus(act.toStatus)}`;
    } else if (!actionPart) {
      actionPart = `${actorName} performed ${act.type} on Task #${act.taskId}`;
    }

    const formattedText = `${actionPart} · ${timeAgo}`;

    return {
      id: act.id,
      taskId: act.taskId,
      projectId: act.projectId,
      projectName: act.project?.name || 'Project',
      actorId: act.actorId,
      actorName,
      type: act.type,
      fromStatus: act.fromStatus,
      toStatus: act.toStatus,
      message: act.message || actionPart,
      createdAt: createdAt.toISOString(),
      formattedText,
    };
  }

  private prettifyStatus(s: string): string {
    switch (s) {
      case 'TODO':
        return 'Todo';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'IN_REVIEW':
        return 'In Review';
      case 'DONE':
        return 'Done';
      default:
        return s;
    }
  }
}

export const activityService = new ActivityService();
