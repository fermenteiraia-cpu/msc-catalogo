/**
 * Result<T, E> — a discriminated union for explicit, throw-free error handling.
 * Used across mutations and Edge Function calls so failures are values, not exceptions.
 */

export type AppError = {
  code: string;
  message: string;
  retryable?: boolean;
  details?: unknown;
};

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
