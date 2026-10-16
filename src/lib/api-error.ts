// Standardized API error responses.
// All API routes should use this to ensure consistent error shape:
//   { error: string, code?: string, details?: unknown, timestamp: string }

import { NextResponse } from "next/server";

export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Return a standardized JSON error response.
 *
 * @param message - Human-readable error message
 * @param status  - HTTP status code (default 500)
 * @param code    - Optional machine-readable error code (e.g. "INVALID_COORDS")
 * @param details - Optional additional context (do NOT include secrets)
 */
export function apiError(
  message: string,
  status = 500,
  code?: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: message,
      code,
      details,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

/**
 * Convenience: 400 Bad Request
 */
export function apiBadRequest(
  message: string,
  code?: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return apiError(message, 400, code, details);
}

/**
 * Convenience: 404 Not Found
 */
export function apiNotFound(message: string, code?: string): NextResponse<ApiErrorBody> {
  return apiError(message, 404, code);
}

/**
 * Convenience: 500 Internal Server Error
 */
export function apiServerError(
  message: string,
  code?: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return apiError(message, 500, code, details);
}
