import { prisma, isDatabaseConnected } from '../db/prisma.js';
import { memoryDb, MemoryNotification } from '../db/memoryStore.js';
import { Notification, NotificationType } from '@prisma/client';

export class NotificationRepository {
  async create(data: {
    userId: string;
    taskId?: number | null;
    title: string;
    message: string;
    type: NotificationType;
  }): Promise<Notification> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.notification.create({
          data: {
            userId: data.userId,
            taskId: data.taskId || null,
            title: data.title,
            message: data.message,
            type: data.type,
          },
        });
      } catch {
        // Fallback
      }
    }

    const newNotif: MemoryNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: data.userId,
      taskId: data.taskId || null,
      title: data.title,
      message: data.message,
      type: data.type,
      isRead: false,
      createdAt: new Date(),
    };
    memoryDb.notifications.unshift(newNotif);
    return newNotif as unknown as Notification;
  }

  async findByUserId(params: {
    userId: string;
    unreadOnly?: boolean;
    skip?: number;
    take?: number;
  }): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const { userId, unreadOnly, skip = 0, take = 20 } = params;

    if (isDatabaseConnected()) {
      try {
        const where: any = { userId };
        if (unreadOnly) where.isRead = false;

        const [notifications, total, unreadCount] = await Promise.all([
          prisma.notification.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
              task: {
                select: { id: true, title: true, status: true, priority: true },
              },
            },
          }),
          prisma.notification.count({ where }),
          prisma.notification.count({ where: { userId, isRead: false } }),
        ]);

        return { notifications: notifications as any, total, unreadCount };
      } catch {
        // Fallback
      }
    }

    let filtered = memoryDb.notifications.filter((n) => n.userId === userId);
    const unreadCount = filtered.filter((n) => !n.isRead).length;

    if (unreadOnly) {
      filtered = filtered.filter((n) => !n.isRead);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = filtered.length;
    const sliced = filtered.slice(skip, skip + take);

    const formatted = sliced.map((n) => {
      const task = n.taskId ? memoryDb.tasks.find((t) => t.id === n.taskId) : null;
      return {
        ...n,
        task: task ? { id: task.id, title: task.title, status: task.status, priority: task.priority } : null,
      };
    });

    return { notifications: formatted as unknown as Notification[], total, unreadCount };
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.notification.update({
          where: { id, userId },
          data: { isRead: true },
        });
      } catch {
        // Fallback
      }
    }

    const notif = memoryDb.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      return notif as unknown as Notification;
    }
    return null;
  }

  async markAllAsRead(userId: string): Promise<number> {
    if (isDatabaseConnected()) {
      try {
        const res = await prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true },
        });
        return res.count;
      } catch {
        // Fallback
      }
    }

    let count = 0;
    for (const n of memoryDb.notifications) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        count++;
      }
    }
    return count;
  }

  async countUnread(userId: string): Promise<number> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.notification.count({
          where: { userId, isRead: false },
        });
      } catch {
        // Fallback
      }
    }

    return memoryDb.notifications.filter((n) => n.userId === userId && !n.isRead).length;
  }
}

export const notificationRepository = new NotificationRepository();
