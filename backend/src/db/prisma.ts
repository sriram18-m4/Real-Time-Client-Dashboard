import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __globalPrismaClient: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ log: [] });
} else {
  if (!global.__globalPrismaClient) {
    global.__globalPrismaClient = new PrismaClient({
      log: env.LOG_LEVEL === 'debug' ? ['query', 'warn'] : [],
    });
  }
  prisma = global.__globalPrismaClient;
}

let isConnected = false;

export function isDatabaseConnected(): boolean {
  return isConnected;
}

export async function initDatabaseConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    isConnected = false;
    return false;
  }

  try {
    const connectPromise = prisma.$connect();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PostgreSQL probe timeout')), 800)
    );
    await Promise.race([connectPromise, timeoutPromise]);
    isConnected = true;
    logger.info('Connected to PostgreSQL database successfully via Prisma.');
    return true;
  } catch {
    isConnected = false;
    logger.info('PostgreSQL not detected; running on resilient in-memory database store.');
    return false;
  }
}

export { prisma };
