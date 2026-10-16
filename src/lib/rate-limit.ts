// API rate limiting middleware for IITGN Walk.
// Uses an in-memory sliding-window counter per IP address.
//
// In production (Vercel serverless), each invocation is isolated, so
// rate limits reset per cold start. For production-grade rate limiting,
// use Vercel KV or Redis. This middleware provides basic protection
// against accidental abuse and rapid-fire requests.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Clean up expired windows periodically (every ~100 entries). */
function prune() {
  if (windows.size > 200) {
    const now = Date.now();
    for (const [key, w] of windows) {
      if (now > w.resetAt) windows.delete(key);
    }
  }
}

/**
 * Check and increment the rate limit for an IP address.
 *
 * @param ip - Client IP address
 * @param maxRequests - Maximum requests allowed per window
 * @param windowMs - Window size in milliseconds
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  prune();
  const now = Date.now();
  const existing = windows.get(ip);

  if (!existing || now > existing.resetAt) {
    windows.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  existing.count += 1;
  const remaining = Math.max(0, maxRequests - existing.count);
  return { allowed: existing.count <= maxRequests, remaining, resetAt: existing.resetAt };
}

/**
 * Middleware wrapper for API routes with rate limiting.
 *
 * @param handler - Next.js API route handler
 * @param options - Rate limit options
 * @param options.maxRequests - Max requests per window (default 30)
 * @param options.windowMs - Window size in ms (default 60000 = 1 min)
 * @param options.ipExtractor - Custom IP extraction (default: x-forwarded-for)
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    maxRequests?: number;
    windowMs?: number;
    ipExtractor?: (req: NextRequest) => string;
  },
) {
  const maxRequests = options?.maxRequests ?? 30;
  const windowMs = options?.windowMs ?? 60_000;
  const ipExtractor = options?.ipExtractor ?? ((req) => {
    const fwd = req.headers.get("x-forwarded-for");
    return fwd ? fwd.split(",")[0].trim() : "unknown";
  });

  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = ipExtractor(req);
    const result = checkRateLimit(ip, maxRequests, windowMs);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
          timestamp: new Date().toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const response = await handler(req);

    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit", String(maxRequests));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.resetAt));

    return response;
  };
}
