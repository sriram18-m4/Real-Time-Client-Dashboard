export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: any[];
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details: any[] = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', code = 'BAD_REQUEST', details: any[] = []): AppError {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED', details: any[] = []): AppError {
    return new AppError(message, 401, code, details);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details: any[] = []): AppError {
    return new AppError(message, 403, code, details);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND', details: any[] = []): AppError {
    return new AppError(message, 404, code, details);
  }

  static conflict(message = 'Resource conflict', code = 'CONFLICT', details: any[] = []): AppError {
    return new AppError(message, 409, code, details);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR', details: any[] = []): AppError {
    return new AppError(message, 500, code, details);
  }
}
