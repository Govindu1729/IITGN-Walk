// POST /api/routes/share
// Creates a shareable route record and returns a public ID.
// Body: { routeResult, from, to, mode, expiresAt? }

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import { apiBadRequest } from "@/lib/api-error";

const ShareSchema = z.object({
  routeResult: z.object({
    objective: z.string(),
    fromLocation: z.string().optional(),
    toLocation: z.string().optional(),
    mode: z.string(),
    path: z.array(z.array(z.number())),
    nodeSlugs: z.array(z.string()),
    distanceM: z.number(),
    durationS: z.number(),
    difficulty: z.number().optional(),
    reason: z.string().optional(),
    speedMps: z.number(),
  }),
  fromLocation: z.string().optional(),
  toLocation: z.string().optional(),
  mode: z.string(),
  expiresAt: z.string().optional(),
});

export const POST = withRateLimit(
  async (req: NextRequest): Promise<NextResponse> => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiBadRequest("Invalid JSON body", "INVALID_BODY");
    }

    const parsed = ShareSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest("Invalid request", "VALIDATION_ERROR", parsed.error.issues);
    }
    const d = parsed.data;

    const shareId = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

    const sharedRoute = await db.sharedRoute.create({
      data: {
        id: shareId,
        routeResult: d.routeResult,
        fromLocation: d.fromLocation ?? null,
        toLocation: d.toLocation ?? null,
        mode: d.mode,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      shareId,
      shareUrl: `/shared/${shareId}`,
      expiresAt: sharedRoute.expiresAt,
    });
  },
  {
    maxRequests: 10,
    windowMs: 60_000,
  },
);
