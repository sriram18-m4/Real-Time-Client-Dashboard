import { prisma, isDatabaseConnected } from '../db/prisma.js';
import { memoryDb, MemoryRefreshToken } from '../db/memoryStore.js';
import { RefreshToken } from '@prisma/client';

export class RefreshTokenRepository {
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.refreshToken.create({ data });
      } catch {
        // Fallback
      }
    }
    const record: MemoryRefreshToken = {
      id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      isRevoked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryDb.refreshTokens.push(record);
    return record as unknown as RefreshToken;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.refreshToken.findUnique({
          where: { tokenHash },
          include: { user: true },
        });
      } catch {
        // Fallback
      }
    }
    const record = memoryDb.refreshTokens.find((rt) => rt.tokenHash === tokenHash);
    if (!record) return null;
    const user = memoryDb.users.find((u) => u.id === record.userId);
    return {
      ...record,
      user,
    } as unknown as RefreshToken;
  }

  async revoke(id: string): Promise<void> {
    if (isDatabaseConnected()) {
      try {
        await prisma.refreshToken.update({
          where: { id },
          data: { isRevoked: true },
        });
        return;
      } catch {
        // Fallback
      }
    }
    const record = memoryDb.refreshTokens.find((rt) => rt.id === id);
    if (record) {
      record.isRevoked = true;
      record.updatedAt = new Date();
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    if (isDatabaseConnected()) {
      try {
        await prisma.refreshToken.updateMany({
          where: { userId, isRevoked: false },
          data: { isRevoked: true },
        });
        return;
      } catch {
        // Fallback
      }
    }
    for (const record of memoryDb.refreshTokens) {
      if (record.userId === userId) {
        record.isRevoked = true;
        record.updatedAt = new Date();
      }
    }
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
