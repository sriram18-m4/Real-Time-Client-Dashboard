import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { env } from './config/env.js';
import { logger } from './logger/logger.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './errors/errorHandler.js';
import { notFoundHandler } from './errors/notFoundHandler.js';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (Cloud Run / Nginx) for accurate client IP and rate limiting
  app.set('trust proxy', 1);

  // 1. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite development & SPA iframe support
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 2. CORS with Credentials
  app.use(
    cors({
      origin: (origin, callback) => {
        // Support env CORS_ORIGIN or local/preview development
        if (!origin || origin === env.CORS_ORIGIN || origin.includes('localhost') || origin.includes('run.app')) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive for testing/preview if configured
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );

  // 3. Body parsers & Cookie parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 4. Request ID & Structured Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const startTime = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      logger[logLevel]({
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip,
      }, `${req.method} ${req.originalUrl} ${res.statusCode} in ${durationMs}ms`);
    });

    next();
  });

  // 5. Mount API Routes
  app.use('/api', apiRoutes);

  // 6. 404 handler for API routes
  app.use('/api/*', notFoundHandler);

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
