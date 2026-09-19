import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../errors/AppError.js';
import { Role, User } from '@prisma/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      requestId?: string;
    }
  }
}

/**
 * Authenticates request via Authorization: Bearer <token>
 * Verifies signature, then loads user freshly from the database.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Authentication token is required', 'MISSING_BEARER_TOKEN');
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;

    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (jwtErr: any) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Access token has expired', 'TOKEN_EXPIRED');
      }
      throw AppError.unauthorized('Invalid access token', 'INVALID_TOKEN');
    }

    if (!decoded.sub) {
      throw AppError.unauthorized('Malformed token payload', 'MALFORMED_TOKEN');
    }

    // Crucial requirement: Load role from DB record, NEVER trust token claim alone
    const user = await userRepository.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User not found or account is deactivated', 'USER_INACTIVE');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorizes user against allowed roles using DB record role.
 * Returns 403 when the user's role is not allowed at all.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED'));
    }

    // Role evaluated directly from database record
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Role ${req.user.role} is not authorized for this resource.`,
          'ROLE_FORBIDDEN'
        )
      );
    }

    next();
  };
}
