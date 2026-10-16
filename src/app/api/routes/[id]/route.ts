// POST /api/routes/share
// Creates a shareable route record and returns a public ID.
// Body: { routeResult, from, to, mode, expiresAt? }

// GET /api/routes/share/:id
// Returns a previously shared route result by public ID.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import type { RouteResult } from "@/lib/routing/types";

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

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const shareId = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

  const sharedRoute = await db.sharedRoute.create({
    data: {
      id: shareId,
      routeResult: JSON.stringify(d.routeResult),
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
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const shared = await db.sharedRoute.findUnique({
    where: { id },
  });

  if (!shared) {
    return NextResponse.json({ error: "Shared route not found" }, { status: 404 });
  }

  if (shared.expiresAt && new Date(shared.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Shared route has expired" }, { status: 410 });
  }

  return NextResponse.json({
    shareId: shared.id,
    routeResult: JSON.parse(shared.routeResult),
    fromLocation: shared.fromLocation,
    toLocation: shared.toLocation,
    mode: shared.mode,
    createdAt: shared.createdAt,
    expiresAt: shared.expiresAt,
  });
}
