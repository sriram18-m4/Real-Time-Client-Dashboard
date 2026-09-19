import cron, { type ScheduledTask } from 'node-cron';
import { taskRepository } from '../repositories/task.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { socketManager } from '../socket/socketServer.js';
import { logger } from '../logger/logger.js';
import { NotificationType } from '@prisma/client';

export class OverdueCronService {
  private cronJob: ScheduledTask | null = null;
  private isScanning = false;

  start(): void {
    if (this.cronJob) return;

    logger.info('⏰ Initializing Overdue Tasks node-cron job (running every 5 minutes: */5 * * * *)...');

    // Runs every 5 minutes
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.runScan();
    });

    // Run an initial scan 10 seconds after server start
    setTimeout(() => {
      this.runScan().catch((err) => logger.error({ err }, 'Initial overdue scan error'));
    }, 10000);
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Overdue cron job stopped.');
    }
  }

  /**
   * Idempotent scan for tasks past due date not done
   */
  async runScan(): Promise<number> {
    if (this.isScanning) {
      logger.warn('Overdue scan already in progress. Skipping cycle.');
      return 0;
    }

    this.isScanning = true;
    const now = new Date();
    let flaggedCount = 0;

    try {
      const overdueTasks = await taskRepository.findTasksNeedingOverdueFlag(now);

      for (const task of overdueTasks) {
        const result = await taskRepository.flagTaskOverdue(task.id, now);
        if (!result) continue;

        flaggedCount++;
        const { activity } = result;

        // Emit real-time WebSocket event
        socketManager.emitTaskActivity({
          activity: {
            id: activity.id,
            taskId: task.id,
            projectId: task.projectId,
            projectName: (task as any).project?.name || 'Project',
            actorId: null,
            actorName: 'System',
            type: 'OVERDUE_FLAGGED',
            fromStatus: null,
            toStatus: null,
            message: `System flagged Task #${task.id} as Overdue (past deadline)`,
            createdAt: now.toISOString(),
            formattedText: `System flagged Task #${task.id} "${task.title}" as Overdue · just now`,
          },
          owningPmId: (task as any).project?.createdById || '',
          assigneeDevId: task.assigneeId,
        });

        // Notify developer if assigned
        if (task.assigneeId) {
          try {
            const notif = await notificationRepository.create({
              userId: task.assigneeId,
              taskId: task.id,
              title: 'Task Overdue Alert',
              message: `Task #${task.id} "${task.title}" is overdue.`,
              type: NotificationType.TASK_OVERDUE,
            });
            const unreadCount = await notificationRepository.countUnread(task.assigneeId);
            socketManager.emitNotification(
              task.assigneeId,
              {
                id: notif.id,
                userId: notif.userId,
                taskId: task.id,
                title: notif.title,
                message: notif.message,
                type: notif.type,
                createdAt: notif.createdAt.toISOString(),
              },
              unreadCount
            );
          } catch (notifErr) {
            logger.error({ notifErr }, 'Failed to create overdue notification');
          }
        }
      }

      if (flaggedCount > 0) {
        logger.info({ flaggedCount }, 'Overdue scan completed: flagged overdue tasks');
      }
    } catch (err) {
      logger.error({ err }, 'Error occurred during overdue cron scan');
    } finally {
      this.isScanning = false;
    }

    return flaggedCount;
  }
}

export const overdueCronService = new OverdueCronService();
