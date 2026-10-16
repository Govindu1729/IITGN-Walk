import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton for serverless-safe database access.
 *
 * In development (Next.js dev server), hot-reloading can create multiple
 * PrismaClient instances, exhausting the connection pool. We store the
 * client on `globalThis` in dev to reuse it across reloads.
 *
 * In production (Vercel serverless), each invocation is isolated, so we
 * always create a fresh client per request — this is the recommended
 * pattern for serverless/edge runtimes.
 */

declare global {
  var prisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  globalThis.prisma ??
  (() => {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    });
    if (process.env.NODE_ENV !== "production") {
      globalThis.prisma = client;
    }
    return client;
  })();
