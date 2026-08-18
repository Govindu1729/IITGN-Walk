// GET /api/campus
// Returns the full campus dataset for the map: building features, road/path
// network (nodes + edges as GeoJSON), and POI locations. Self-contained —
// no third-party map tiles are used.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/campus/loader";
import { CAMPUS_BOUNDS, CAMPUS_CENTER } from "@/lib/campus/seed";
import { haversine } from "@/lib/geo/geo";

export async function GET() {
  await ensureSeeded();
  const [features, nodes, edges, locations] = await Promise.all([
    db.campusFeature.findMany(),
    db.roadNode.findMany(),
    db.roadEdge.findMany({ where: { walkable: true } }),
    db.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Build GeoJSON feature collections
  const buildingsFC = {
    type: "FeatureCollection" as const,
    features: features.map((f) => ({
      type: "Feature" as const,
      geometry: JSON.parse(f.geomJson),
      properties: {
        id: f.id,
        kind: f.kind,
        name: f.name,
        color: f.color,
      },
    })),
  };

  const nodesFC = {
    type: "FeatureCollection" as const,
    features: nodes.map((n) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [n.lng, n.lat] },
      properties: {
        slug: n.slug,
        kind: n.kind,
        label: n.label,
        locationSlug: n.locationSlug,
      },
    })),
  };

  const nodeMap = new Map(nodes.map((n) => [n.slug, n]));
  const edgesFC = {
    type: "FeatureCollection" as const,
    features: edges
      .map((e) => {
        const a = nodeMap.get(e.startNode);
        const b = nodeMap.get(e.endNode);
        if (!a || !b) return null;
        return {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [a.lng, a.lat],
              [b.lng, b.lat],
            ],
          },
          properties: {
            slug: e.slug,
            roadType: e.roadType,
            lighting: e.lighting,
            surface: e.surfaceType,
            distanceM: e.distanceM,
          },
        };
      })
      .filter(Boolean),
  };

  // Locations as labelled points
  const locationsFC = {
    type: "FeatureCollection" as const,
    features: locations.map((l) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
      properties: {
        slug: l.slug,
        name: l.name,
        category: l.category,
        entryNode: l.entryNode,
      },
    })),
  };

  return NextResponse.json({
    center: CAMPUS_CENTER,
    bounds: CAMPUS_BOUNDS,
    buildings: buildingsFC,
    network: {
      nodes: nodesFC,
      edges: edgesFC,
    },
    locations: locationsFC,
    locationList: locations.map((l) => ({
      slug: l.slug,
      name: l.name,
      category: l.category,
      lng: l.lng,
      lat: l.lat,
      entryNode: l.entryNode,
      notes: l.notes,
      distFromCenter: haversine({ lat: l.lat, lng: l.lng }, CAMPUS_CENTER),
    })),
  });
}
