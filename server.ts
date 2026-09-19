import http from 'http';
import path from 'path';
import express from 'express';
import { createApp } from './backend/src/app.js';
import { socketManager } from './backend/src/socket/socketServer.js';
import { overdueCronService } from './backend/src/services/overdueCron.service.js';
import { logger } from './backend/src/logger/logger.js';
import { memoryDb } from './backend/src/db/memoryStore.js';
import { initDatabaseConnection } from './backend/src/db/prisma.js';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    // 0. Probe database connection status
    await initDatabaseConnection();

    // 1. Initialize in-memory seed data for instant testing / fallback
    await memoryDb.seedIfEmpty();

    // 2. Initialize Express application
    const app = createApp();

    // 3. Create HTTP server & bind Socket.io
    const httpServer = http.createServer(app);
    socketManager.initialize(httpServer);

    // 4. Start Overdue Tasks cron background service
    overdueCronService.start();

    // 5. Mount Vite middleware in development or serve static files in production
    if (process.env.NODE_ENV !== 'production') {
      // Loaded lazily so production never imports vite (and its native rolldown binding)
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      logger.info('Vite development middleware mounted');
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      logger.info('Static production build serving enabled');
    }

    // 6. Listen on the host-provided port (falls back to 3000) and 0.0.0.0
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server successfully listening on http://0.0.0.0:${PORT}`);
    });

    // Graceful shutdown handling
    const shutdown = () => {
      logger.info('Shutting down server gracefully...');
      overdueCronService.stop();
      httpServer.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error({ err: error }, 'Fatal error during server startup');
    process.exit(1);
  }
}

startServer();
