import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';
import { presenceTracker } from './presence.js';
import { SocketEvent, ActivityEventPayload, NotificationEventPayload } from './events.js';
import { userRepository } from '../repositories/user.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { Role } from '@prisma/client';

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
}

class SocketManager {
  private io: Server | null = null;

  initialize(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      transports: ['websocket'], // Strictly WebSocket only - no long-polling allowed
      cors: {
        origin: (origin, callback) => {
          // Allow local/preview origins with credentials
          callback(null, true);
        },
        credentials: true,
      },
    });

    // Handshake Authentication Middleware
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          logger.warn({ socketId: socket.id }, 'Socket connection rejected: No authentication token');
          return next(new Error('AUTHENTICATION_REQUIRED'));
        }

        let decoded: any;
        try {
          decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        } catch (jwtErr) {
          logger.warn({ socketId: socket.id, err: (jwtErr as Error).message }, 'Socket token verification failed');
          return next(new Error('INVALID_TOKEN'));
        }

        // Verify user against database to prevent escalation from stale tokens
        const user = await userRepository.findById(decoded.sub);
        if (!user || !user.isActive) {
          logger.warn({ userId: decoded.sub }, 'Socket connection rejected: User inactive or not found');
          return next(new Error('USER_NOT_FOUND_OR_INACTIVE'));
        }

        (socket as AuthenticatedSocket).user = {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        };

        next();
      } catch (err) {
        next(new Error('INTERNAL_SOCKET_AUTH_ERROR'));
      }
    });

    // Connection Handler
    this.io.on('connection', async (rawSocket: Socket) => {
      const socket = rawSocket as AuthenticatedSocket;
      const user = socket.user;

      // 1. Join personal user room: user:{id}
      socket.join(`user:${user.id}`);

      // 2. Join role room if admin: role:admin
      if (user.role === Role.ADMIN) {
        socket.join('role:admin');
      }

      // 3. Update presence and broadcast online count to role:admin
      const { onlineCount } = presenceTracker.addUserSocket(user.id, socket.id);
      this.io?.to('role:admin').emit(SocketEvent.PRESENCE_COUNT, { onlineCount });

      logger.info({ userId: user.id, role: user.role, socketId: socket.id }, 'Socket connected and joined rooms');

      // 4. Client requests to join a project room
      socket.on(SocketEvent.JOIN_PROJECT, async (data: { projectId: string }, callback) => {
        try {
          const { projectId } = data;
          if (!projectId) return callback?.({ error: 'Missing projectId' });

          // Service-level authorization check: Only Admin or the PM who owns the project can join project:{id}
          const project = await projectRepository.findById(projectId);
          if (!project) return callback?.({ error: 'Project not found' });

          const isAuthorized = user.role === Role.ADMIN || (user.role === Role.PROJECT_MANAGER && project.createdById === user.id);

          if (!isAuthorized) {
            logger.warn({ userId: user.id, projectId }, 'Unauthorized attempt to join project room');
            return callback?.({ error: 'Forbidden: Insufficient project permissions' });
          }

          socket.join(`project:${projectId}`);
          logger.debug({ userId: user.id, projectId }, 'User joined project room');
          callback?.({ success: true, projectId });
        } catch (err) {
          callback?.({ error: 'Failed to join project room' });
        }
      });

      // 5. Leave project room
      socket.on(SocketEvent.LEAVE_PROJECT, (data: { projectId: string }) => {
        if (data?.projectId) {
          socket.leave(`project:${data.projectId}`);
        }
      });

      // 6. Disconnect handler
      socket.on('disconnect', async () => {
        const { userWentOffline, onlineCount: remainingOnline } = presenceTracker.removeUserSocket(user.id, socket.id);

        if (userWentOffline) {
          // Update last_seen_at in database on disconnect for missed-events catch-up
          const now = new Date();
          await userRepository.updateLastSeen(user.id, now);
        }

        this.io?.to('role:admin').emit(SocketEvent.PRESENCE_COUNT, { onlineCount: remainingOnline });
        logger.info({ userId: user.id, socketId: socket.id, remainingOnline }, 'Socket disconnected');
      });
    });

    return this.io;
  }

  getIO(): Server | null {
    return this.io;
  }

  /**
   * Broadcast presence to Admin
   */
  emitPresenceToAdmin(): void {
    if (!this.io) return;
    const onlineCount = presenceTracker.getOnlineUserCount();
    this.io.to('role:admin').emit(SocketEvent.PRESENCE_COUNT, { onlineCount });
  }

  /**
   * Server-side targeted emission for task status changes:
   * Emits to:
   * 1. role:admin
   * 2. Owning PM's user room (user:{pmId})
   * 3. Assigned Developer's user room (user:{devId})
   * 4. project:{id} room (if joined)
   */
  emitTaskActivity(params: {
    activity: ActivityEventPayload;
    owningPmId: string;
    assigneeDevId?: string | null;
  }): void {
    if (!this.io) return;

    const { activity, owningPmId, assigneeDevId } = params;

    // 1. Admin room
    this.io.to('role:admin').emit(SocketEvent.ACTIVITY_NEW, activity);

    // 2. Owning PM room
    if (owningPmId) {
      this.io.to(`user:${owningPmId}`).emit(SocketEvent.ACTIVITY_NEW, activity);
    }

    // 3. Assigned Dev room
    if (assigneeDevId && assigneeDevId !== owningPmId) {
      this.io.to(`user:${assigneeDevId}`).emit(SocketEvent.ACTIVITY_NEW, activity);
    }

    // 4. Project room (for project detail live updates)
    if (activity.projectId) {
      this.io.to(`project:${activity.projectId}`).emit(SocketEvent.ACTIVITY_NEW, activity);
      this.io.to(`project:${activity.projectId}`).emit(SocketEvent.TASK_UPDATED, {
        taskId: activity.taskId,
        status: activity.toStatus,
      });
    }
  }

  /**
   * Send real-time notification to a specific user
   */
  emitNotification(userId: string, notification: NotificationEventPayload, unreadCount: number): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(SocketEvent.NOTIFICATION_NEW, notification);
    this.io.to(`user:${userId}`).emit(SocketEvent.NOTIFICATION_UNREAD_COUNT, { unreadCount });
  }

  emitUnreadCount(userId: string, unreadCount: number): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(SocketEvent.NOTIFICATION_UNREAD_COUNT, { unreadCount });
  }
}

export const socketManager = new SocketManager();
