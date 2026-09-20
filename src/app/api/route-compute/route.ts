// POST /api/route-compute
// Body: { from: locationSlug, to: locationSlug, mode: 'RELAXED'|'NORMAL'|'HURRY' }
//   OR { fromCoord: {lat,lng}, to: locationSlug, mode } for GPS-based origin.
// Returns: { fastest?, shortest?, easiest?, alternative?, speedMps }

import { NextResponse } from "next/server";
import { z } from "zod";
import { getGraph } from "@/lib/campus/loader";
import { computeRoutes } from "@/lib/routing/router";
import { getLearnedSpeeds } from "@/lib/routing/profiles";
import { generateDirections } from "@/lib/routing/directions";
import { validateRouteRequest } from "@/lib/validation";
import type { RouteResult, WalkingMode } from "@/lib/routing/types";

const CoordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const Schema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    fromCoord: CoordSchema.optional(),
    toCoord: CoordSchema.optional(),
    mode: z.enum(["RELAXED", "NORMAL", "HURRY"]).default("NORMAL"),
    accessibleOnly: z.boolean().default(false),
    /** Optional custom walking speed (m/s). When > 0, overrides the learned
     *  campus speed for ALL modes — used by the user's Settings panel. */
    customSpeedMps: z.number().min(0).max(5).optional(),
    /** Penalise edges with poor/partial lighting (avoid shaded/dark paths). */
    avoidShaded: z.boolean().default(false),
    /** Reward edges with `lighting: "GOOD"` (sheltered walks). */
    preferSheltered: z.boolean().default(false),
    /** Reward edges with `trafficLevel: "LOW"` (avoid crowds). */
    avoidCrowds: z.boolean().default(false),
    /** Optional intermediate location slug — single via point (legacy). */
    viaPoint: z.string().optional(),
    /** Ordered list of via points (waypoints) — up to 3. */
    viaPoints: z.array(z.string()).max(3).optional(),
  })
  .refine((d) => d.from || d.fromCoord, {
    message: "Either `from` or `fromCoord` is required",
  })
  .refine((d) => d.to || d.toCoord, {
    message: "Either `to` or `toCoord` is required",
  });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Additional validation for GPS coordinates (campus bounds check)
  if (d.fromCoord) {
    const validated = validateRouteRequest({
      startLat: d.fromCoord.lat,
      startLng: d.fromCoord.lng,
      endLat: d.toCoord?.lat ?? 0,
      endLng: d.toCoord?.lng ?? 0,
      mode: d.mode,
    });

    if (d.fromCoord && !validated) {
      return NextResponse.json(
        { error: "Coordinates must be within campus bounds" },
        { status: 400 }
      );
    }
  }

  let graph = await getGraph();

  // Accessibility filter: remove edges with stairs or unpaved surfaces
  if (d.accessibleOnly) {
    graph = {
      ...graph,
      edges: graph.edges.filter((e) => {
        const hasStairs = e.roadType === "STEPS" || (e.notes && e.notes.toLowerCase().includes("stair"));
        const isUnpaved = e.surfaceType === "DIRT" || e.surfaceType === "GRASS";
        return !hasStairs && !isUnpaved && e.walkable;
      }),
      adj: new Map(
        [...graph.adj.entries()].map(([nodeSlug, neighbors]) => [
          nodeSlug,
          neighbors.filter(({ edge }) => {
            const hasStairs = edge.roadType === "STEPS" || (edge.notes && edge.notes.toLowerCase().includes("stair"));
            const isUnpaved = edge.surfaceType === "DIRT" || edge.surfaceType === "GRASS";
            return !hasStairs && !isUnpaved && edge.walkable;
          }),
        ]),
      ),
    };
  }

  const learned = await getLearnedSpeeds();

  // If the user provided a custom walking speed in Settings, override the
  // learned speed for ALL three modes — the routing engine picks the speed
  // for the requested mode, so we set them all to the same value.
  const effectiveLearned =
    d.customSpeedMps && d.customSpeedMps > 0
      ? {
          RELAXED: d.customSpeedMps,
          NORMAL: d.customSpeedMps,
          HURRY: d.customSpeedMps,
        }
      : learned;

  // Merge the legacy single `viaPoint` into the multi-waypoint `viaPoints`
  // array (deduplicated, viaPoint first) so the router receives one ordered
  // list. The router also tolerates `viaLocation` directly — we pass both
  // forms for safety but `viaLocations` wins when both are set.
  const mergedViaPoints: string[] = [];
  if (d.viaPoint) mergedViaPoints.push(d.viaPoint);
  if (Array.isArray(d.viaPoints)) {
    for (const v of d.viaPoints) {
      if (v && !mergedViaPoints.includes(v)) mergedViaPoints.push(v);
    }
  }
  // Cap at 3 to honour the UI constraint (router would accept more).
  const viaLocations = mergedViaPoints.slice(0, 3);
  // Keep the legacy single `viaLocation` field populated when only one via
  // point was provided — preserves backward compat with any caller that
  // inspects that field directly (and the router merges it back into the
  // array anyway).
  const viaLocation = viaLocations.length > 0 ? viaLocations[0] : undefined;

  const result = computeRoutes(
    graph,
    {
      fromLocation: d.from,
      toLocation: d.to,
      fromCoord: d.fromCoord,
      toCoord: d.toCoord,
      mode: d.mode as WalkingMode,
      customization: {
        avoidShaded: d.avoidShaded,
        preferSheltered: d.preferSheltered,
        avoidCrowds: d.avoidCrowds,
      },
      viaLocation,
      viaLocations,
    },
    effectiveLearned,
  );
  // Attach turn-by-turn directions to each route (for the directions panel).
  for (const key of ["fastest", "shortest", "easiest", "alternative"] as const) {
    const r = result[key] as RouteResult | undefined;
    if (r) {
      r.steps = generateDirections(graph, r);
    }
  }
  return NextResponse.json(result);
}
