import { projectRepository } from '../repositories/project.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { clientRepository } from '../repositories/client.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { presenceTracker } from '../socket/presence.js';
import { Role, User, TaskStatus, TaskPriority } from '@prisma/client';

export class DashboardService {
  async getDashboardData(user: User): Promise<any> {
    switch (user.role) {
      case Role.ADMIN:
        return await this.getAdminDashboard();
      case Role.PROJECT_MANAGER:
        return await this.getPmDashboard(user);
      case Role.DEVELOPER:
        return await this.getDeveloperDashboard(user);
      default:
        return {};
    }
  }

  /**
   * Admin Dashboard:
   * - Total projects
   * - Total clients & users
   * - Task counts by status
   * - Overdue count
   * - Live online users
   */
  private async getAdminDashboard(): Promise<any> {
    const [{ total: totalProjects, projects }, { total: totalClients }, { total: totalUsers }, { tasks: allTasks, total: totalTasks }] =
      await Promise.all([
        projectRepository.findMany({ take: 100 }),
        clientRepository.findMany({ take: 1 }),
        userRepository.findMany({ take: 1 }),
        taskRepository.findMany({ take: 500 }),
      ]);

    const statusCounts: Record<TaskStatus, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    let overdueCount = 0;
    const now = new Date();

    for (const t of allTasks) {
      if (statusCounts[t.status as TaskStatus] !== undefined) {
        statusCounts[t.status as TaskStatus]++;
      }
      if (t.isOverdue || (new Date(t.dueDate) < now && t.status !== TaskStatus.DONE)) {
        overdueCount++;
      }
    }

    const liveOnlineUsers = presenceTracker.getOnlineUserCount();

    return {
      role: Role.ADMIN,
      metrics: {
        totalProjects,
        totalClients,
        totalUsers,
        totalTasks,
        overdueCount,
        liveOnlineUsers,
      },
      taskCountsByStatus: statusCounts,
      recentProjects: projects.slice(0, 5),
    };
  }

  /**
   * PM Dashboard:
   * - Own project summaries
   * - Tasks by priority
   * - Tasks due this week
   */
  private async getPmDashboard(user: User): Promise<any> {
    const { projects } = await projectRepository.findMany({ createdById: user.id, take: 100 });
    const projectIds = projects.map((p) => p.id);

    const { tasks: pmTasks } = await taskRepository.findMany({
      projectIds,
      take: 500,
    });

    const priorityCounts: Record<TaskPriority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    const statusCounts: Record<TaskStatus, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    const now = new Date();
    const oneWeekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tasksDueThisWeek: any[] = [];
    let overdueCount = 0;

    for (const t of pmTasks) {
      if (priorityCounts[t.priority as TaskPriority] !== undefined) {
        priorityCounts[t.priority as TaskPriority]++;
      }
      if (statusCounts[t.status as TaskStatus] !== undefined) {
        statusCounts[t.status as TaskStatus]++;
      }

      const due = new Date(t.dueDate);
      if (due >= now && due <= oneWeekAhead && t.status !== TaskStatus.DONE) {
        tasksDueThisWeek.push(t);
      }
      if (t.isOverdue || (due < now && t.status !== TaskStatus.DONE)) {
        overdueCount++;
      }
    }

    // Sort tasks due this week by due date asc
    tasksDueThisWeek.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return {
      role: Role.PROJECT_MANAGER,
      metrics: {
        ownProjectsCount: projects.length,
        totalTasksCount: pmTasks.length,
        dueThisWeekCount: tasksDueThisWeek.length,
        overdueCount,
      },
      ownProjects: projects,
      tasksByPriority: priorityCounts,
      tasksByStatus: statusCounts,
      tasksDueThisWeek: tasksDueThisWeek.slice(0, 10),
    };
  }

  /**
   * Developer Dashboard:
   * - Assigned tasks sorted by priority (Critical first) then due date
   */
  private async getDeveloperDashboard(user: User): Promise<any> {
    const { tasks: devTasks, total } = await taskRepository.findMany({
      assigneeId: user.id,
      take: 100,
    });

    const statusCounts: Record<TaskStatus, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    let overdueCount = 0;
    const now = new Date();

    for (const t of devTasks) {
      if (statusCounts[t.status as TaskStatus] !== undefined) {
        statusCounts[t.status as TaskStatus]++;
      }
      if (t.isOverdue || (new Date(t.dueDate) < now && t.status !== TaskStatus.DONE)) {
        overdueCount++;
      }
    }

    // Sort assigned tasks by priority (Critical first) then dueDate asc
    const priorityOrder: Record<TaskPriority, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const sortedTasks = [...devTasks].sort((a, b) => {
      const pDiff = (priorityOrder[b.priority as TaskPriority] || 0) - (priorityOrder[a.priority as TaskPriority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return {
      role: Role.DEVELOPER,
      metrics: {
        assignedTotal: total,
        inProgressCount: statusCounts.IN_PROGRESS,
        inReviewCount: statusCounts.IN_REVIEW,
        doneCount: statusCounts.DONE,
        overdueCount,
      },
      tasksByStatus: statusCounts,
      assignedTasks: sortedTasks,
    };
  }
}

export const dashboardService = new DashboardService();
