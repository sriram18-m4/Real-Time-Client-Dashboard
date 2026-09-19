import { Request, Response } from 'express';
import { AppError } from './AppError.js';

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} does not exist`,
      details: [],
    },
    requestId,
  });
}
