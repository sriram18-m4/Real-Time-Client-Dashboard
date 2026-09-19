import { notificationRepository } from '../repositories/notification.repository.js';
import { socketManager } from '../socket/socketServer.js';
import { AppError } from '../errors/AppError.js';
import { User } from '@prisma/client';

export class NotificationService {
  async listNotifications(
    user: User,
    params: {
      unreadOnly?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ notifications: any[]; total: number; unreadCount: number; page: number; totalPages: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const { notifications, total, unreadCount } = await notificationRepository.findByUserId({
      userId: user.id,
      unreadOnly: params.unreadOnly,
      skip,
      take: limit,
    });

    return {
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markAsRead(id: string, user: User): Promise<any> {
    const notif = await notificationRepository.markAsRead(id, user.id);
    if (!notif) {
      throw AppError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    const unreadCount = await notificationRepository.countUnread(user.id);
    socketManager.emitUnreadCount(user.id, unreadCount);

    return notif;
  }

  async markAllAsRead(user: User): Promise<{ count: number; unreadCount: number }> {
    const count = await notificationRepository.markAllAsRead(user.id);
    socketManager.emitUnreadCount(user.id, 0);

    return { count, unreadCount: 0 };
  }
}

export const notificationService = new NotificationService();
