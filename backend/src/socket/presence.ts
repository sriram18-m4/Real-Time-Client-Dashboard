import { logger } from '../logger/logger.js';

class PresenceTracker {
  // Map of userId -> Set of active socket IDs (so multiple tabs count once)
  private userSockets: Map<string, Set<string>> = new Map();

  addUserSocket(userId: string, socketId: string): { isNewUser: boolean; onlineCount: number } {
    let sockets = this.userSockets.get(userId);
    let isNewUser = false;

    if (!sockets) {
      sockets = new Set<string>();
      this.userSockets.set(userId, sockets);
      isNewUser = true;
    }

    sockets.add(socketId);
    const onlineCount = this.getOnlineUserCount();
    logger.debug({ userId, socketId, onlineCount }, 'User socket connected');
    return { isNewUser, onlineCount };
  }

  removeUserSocket(userId: string, socketId: string): { userWentOffline: boolean; onlineCount: number } {
    const sockets = this.userSockets.get(userId);
    let userWentOffline = false;

    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        userWentOffline = true;
      }
    }

    const onlineCount = this.getOnlineUserCount();
    logger.debug({ userId, socketId, userWentOffline, onlineCount }, 'User socket disconnected');
    return { userWentOffline, onlineCount };
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
}

export const presenceTracker = new PresenceTracker();
