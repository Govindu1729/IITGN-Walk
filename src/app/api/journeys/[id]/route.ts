// PATCH /api/journeys/[id]
// Body: { status: 'COMPLETED'|'ABANDONED', actualS?, actualM?, gpsTrace?: [...] }
// On COMPLETED: stores GPS points, recomputes campus-level walking speeds,
// and updates the journey. Privacy: no PII beyond coordinates + mode.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { recomputeCampusSpeeds } from "@/lib/routing/profiles";

const GpsSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracyM: z.number().optional(),
  capturedTs: z.string(), // ISO
  matched: z.boolean().optional(),
  matchedNode: z.string().optional(),
});

const PatchSchema = z.object({
  status: z.enum(["COMPLETED", "ABANDONED"]).optional(),
  actualS: z.number().optional(),
  actualM: z.number().optional(),
  gpsTrace: z.array(GpsSchema).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const journey = await db.journey.findUnique({ where: { id } });
  if (!journey) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const gps = await db.gpsPoint.findMany({
    where: { journeyId: id },
    orderBy: { capturedTs: "asc" },
  });
  return NextResponse.json({ journey, gpsTrace: gps });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const journey = await db.journey.findUnique({ where: { id } });
  if (!journey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Store GPS trace (privacy: only lat/lng/accuracy/timestamp + optional match)
  if (d.gpsTrace && d.gpsTrace.length) {
    // remove any prior points for this journey (idempotent re-submit)
    await db.gpsPoint.deleteMany({ where: { journeyId: id } });
    await db.gpsPoint.createMany({
      data: d.gpsTrace.map((g) => ({
        journeyId: id,
        lat: g.lat,
        lng: g.lng,
        accuracyM: g.accuracyM ?? null,
        capturedTs: new Date(g.capturedTs),
        matched: g.matched ?? false,
        matchedNode: g.matchedNode ?? null,
      })),
    });
  }

  const now = new Date();
  const updates: Record<string, unknown> = {};
  if (d.status) {
    updates.status = d.status;
    updates.endTs = now;
  }
  if (typeof d.actualS === "number") updates.actualS = d.actualS;
  if (typeof d.actualM === "number") updates.actualM = d.actualM;

  const updated = await db.journey.update({ where: { id }, data: updates });

  // When a journey completes with valid data, recompute learned speeds
  if (d.status === "COMPLETED" && (d.actualS ?? 0) > 0 && (d.actualM ?? 0) > 0) {
    await recomputeCampusSpeeds();
  }

  return NextResponse.json({ journey: updated });
}
