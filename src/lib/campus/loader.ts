// Campus data loader. Single source of truth: the SQLite DB.
//
// On first request it idempotently seeds the IITGN dataset (so the app works
// immediately). It then builds and caches an in-memory Graph for the router.
// Editing RoadNode / RoadEdge / Location / CampusFeature rows updates both the
// map (which reads from DB) and the router (which rebuilds the cache).

import { db } from "../db";
import {
  SEED_BUILDINGS,
  SEED_LOCATIONS,
  buildAllEdges,
  buildAllNodes,
  buildingToGeoJSON,
} from "./seed";
import { buildGraph, type RawEdge, type RawNode } from "../routing/graph";
import type { Graph } from "../routing/types";

let seedPromise: Promise<void> | null = null;
let graphCache: Graph | null = null;

/** Idempotently seed the DB. Safe to call multiple times. */
export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = doSeed();
  return seedPromise;
}

async function doSeed(): Promise<void> {
  // Locations
  const locCount = await db.location.count();
  if (locCount === 0) {
    for (const l of SEED_LOCATIONS) {
      await db.location.create({
        data: {
          slug: l.slug,
          name: l.name,
          category: l.category,
          // lat/lng from seed grid
          lat:
            23.21 +
            l.north / 111320,
          lng:
            72.685 +
            l.east / (111320 * Math.cos((23.21 * Math.PI) / 180)),
          entryNode: l.entry,
          notes: l.notes ?? null,
        },
      });
    }
  }

  // RoadNodes (junctions + entrance nodes)
  const nodeCount = await db.roadNode.count();
  if (nodeCount === 0) {
    for (const n of buildAllNodes()) {
      await db.roadNode.create({
        data: {
          slug: n.slug,
          lat: n.lat,
          lng: n.lng,
          kind: n.kind,
          label: n.label ?? null,
          locationSlug: n.locationSlug ?? null,
        },
      });
    }
  }

  // RoadEdges
  const edgeCount = await db.roadEdge.count();
  if (edgeCount === 0) {
    for (const e of buildAllEdges()) {
      await db.roadEdge.create({
        data: {
          slug: e.slug,
          startNode: e.from,
          endNode: e.to,
          distanceM: e.distanceM,
          estTimeSec: e.estTimeSec,
          roadType: e.roadType,
          walkable: e.walkable,
          lighting: e.lighting ?? null,
          surfaceType: e.surfaceType ?? null,
          slope: e.slope ?? null,
          trafficLevel: e.trafficLevel ?? null,
          notes: e.notes ?? null,
        },
      });
    }
  }

  // CampusFeatures (building footprints, greens, courts)
  const featCount = await db.campusFeature.count();
  if (featCount === 0) {
    for (const b of SEED_BUILDINGS) {
      const gj = buildingToGeoJSON(b);
      await db.campusFeature.create({
        data: {
          kind: b.kind,
          name: b.name,
          geomJson: JSON.stringify(gj.geometry),
          color: b.color ?? null,
        },
      });
    }
  }

  // WalkingProfile defaults
  const profCount = await db.walkingProfile.count();
  if (profCount === 0) {
    const defaults: Record<string, number> = {
      RELAXED: 0.9,
      NORMAL: 1.25,
      HURRY: 1.6,
    };
    for (const [mode, speed] of Object.entries(defaults)) {
      await db.walkingProfile.create({
        data: {
          mode,
          scope: "CAMPUS",
          userId: "",
          speedMps: speed,
          samples: 0,
          sumDistM: 0,
          sumTimeS: 0,
        },
      });
    }
  }

  // invalidate graph cache after seeding
  graphCache = null;
}

/** Load the in-memory graph from DB (cached, rebuilt on demand). */
export async function getGraph(): Promise<Graph> {
  if (graphCache) return graphCache;
  await ensureSeeded();
  const [nodes, edges] = await Promise.all([
    db.roadNode.findMany(),
    db.roadEdge.findMany(),
  ]);
  const rawNodes: RawNode[] = nodes.map((n) => ({
    slug: n.slug,
    lat: n.lat,
    lng: n.lng,
    kind: n.kind as RawNode["kind"],
    label: n.label,
    locationSlug: n.locationSlug,
  }));
  const rawEdges: RawEdge[] = edges.map((e) => ({
    slug: e.slug,
    from: e.startNode,
    to: e.endNode,
    distanceM: e.distanceM,
    estTimeSec: e.estTimeSec,
    roadType: e.roadType as RawEdge["roadType"],
    walkable: e.walkable,
    lighting: e.lighting,
    surfaceType: e.surfaceType,
    slope: e.slope,
    trafficLevel: e.trafficLevel,
    notes: e.notes,
  }));
  graphCache = buildGraph(rawNodes, rawEdges);
  return graphCache;
}

/** Invalidate the in-memory graph cache (e.g. after graph edits). */
export function invalidateGraphCache() {
  graphCache = null;
}
