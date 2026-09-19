import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError.js';
import { logger } from '../logger/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const isOperationalClientError =
    (err instanceof AppError && err.statusCode < 500) ||
    err instanceof ZodError ||
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError';

  if (isOperationalClientError) {
    logger.warn({
      requestId,
      method: req.method,
      url: req.originalUrl,
      errorName: err.name,
      errorMessage: err.message,
      code: err.code,
      statusCode: err.statusCode || (err instanceof ZodError ? 400 : 401),
    });
  } else {
    // Log unexpected 500 error server-side with stack trace
    logger.error({
      requestId,
      method: req.method,
      url: req.originalUrl,
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
      code: err.code,
    });
  }

  // 1. Zod Validation Errors -> 400 with field-level details
  if (err instanceof ZodError) {
    const issues = (err as any).issues || (err as any).errors || [];
    const fieldDetails = issues.map((e: any) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
      message: e.message,
      rule: e.code,
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: fieldDetails,
      },
      requestId,
    });
    return;
  }

  // 2. Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId,
    });
    return;
  }

  // 3. JWT Specific Errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid or corrupted',
        details: [],
      },
      requestId,
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
        details: [],
      },
      requestId,
    });
    return;
  }

  // 4. Default 500 Internal Error
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please contact support.',
      details: [],
    },
    requestId,
  });
}
