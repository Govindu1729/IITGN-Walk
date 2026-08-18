// POST /api/journeys
// Body: { from, to, mode, routeId?, predictedS? } -> creates an IN_PROGRESS
// journey record and returns { journeyId }.
//
// GET /api/journeys -> list journeys (optionally ?status=COMPLETED)

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const CreateSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  mode: z.enum(["RELAXED", "NORMAL", "HURRY"]),
  routeId: z.string().optional(),
  predictedS: z.number().optional(),
  userId: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const journey = await db.journey.create({
    data: {
      userId: d.userId ?? null,
      fromLocation: d.from ?? null,
      toLocation: d.to ?? null,
      mode: d.mode,
      routeId: d.routeId ?? null,
      predictedS: d.predictedS ?? null,
      startTs: new Date(),
      status: "IN_PROGRESS",
    },
  });
  return NextResponse.json({ journeyId: journey.id });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("limit") ?? "100")),
  );
  const journeys = await db.journey.findMany({
    where: status ? { status: status as "COMPLETED" | "IN_PROGRESS" | "ABANDONED" } : undefined,
    orderBy: { startTs: "desc" },
    take: limit,
  });
  return NextResponse.json({ journeys });
}
