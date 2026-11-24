/**
 * Standard Application Error & Result Convention
 * Enforces structured error codes and typesafe Result<T, E> handling.
 * Never display an "empty" state when a request actually suffered an error.
 */

export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'OFFLINE_QUEUED'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status?: number;
  readonly details?: unknown;
  readonly isAppError = true;

  constructor(message: string, code: AppErrorCode = 'UNKNOWN_ERROR', status?: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static from(err: unknown, defaultMessage = 'An unexpected error occurred'): AppError {
    if (err instanceof AppError) return err;
    if (err instanceof Error) {
      return new AppError(err.message, 'SERVER_ERROR', undefined, err);
    }
    if (typeof err === 'string') {
      return new AppError(err, 'UNKNOWN_ERROR');
    }
    return new AppError(defaultMessage, 'UNKNOWN_ERROR', undefined, err);
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError || (Boolean(value) && typeof value === 'object' && (value as any).isAppError === true);
}

export type Result<T, E = AppError> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { success: false, error };
}
