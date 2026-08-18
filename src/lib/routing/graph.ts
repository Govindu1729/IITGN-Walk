// Graph builder: turn flat DB rows (or seed arrays) into an in-memory Graph
// with bidirectional adjacency. Kept separate from the routing algorithms so
// the data source can be swapped (DB vs JSON vs remote geospatial service).

import type { Graph, GraphEdge, GraphNode } from "./types";

export interface RawNode {
  slug: string;
  lat: number;
  lng: number;
  kind: GraphNode["kind"];
  label?: string | null;
  locationSlug?: string | null;
}

export interface RawEdge {
  slug: string;
  from: string;
  to: string;
  distanceM: number;
  estTimeSec: number;
  roadType: GraphEdge["roadType"];
  walkable: boolean;
  lighting?: string | null;
  surfaceType?: string | null;
  slope?: number | null;
  trafficLevel?: string | null;
  notes?: string | null;
}

function coerceEdge(raw: RawEdge): GraphEdge {
  return {
    slug: raw.slug,
    from: raw.from,
    to: raw.to,
    distanceM: raw.distanceM,
    estTimeSec: raw.estTimeSec,
    roadType: raw.roadType,
    walkable: raw.walkable,
    lighting: (raw.lighting ?? undefined) as GraphEdge["lighting"],
    surfaceType: (raw.surfaceType ?? undefined) as GraphEdge["surfaceType"],
    slope: raw.slope ?? undefined,
    trafficLevel: (raw.trafficLevel ?? undefined) as GraphEdge["trafficLevel"],
    notes: raw.notes ?? undefined,
  };
}

function coerceNode(raw: RawNode): GraphNode {
  return {
    slug: raw.slug,
    lat: raw.lat,
    lng: raw.lng,
    kind: raw.kind,
    label: raw.label ?? undefined,
    locationSlug: raw.locationSlug ?? undefined,
  };
}

/** Build a Graph from raw nodes + edges (e.g. from the DB). Bidirectional. */
export function buildGraph(rawNodes: RawNode[], rawEdges: RawEdge[]): Graph {
  const nodes = new Map<string, GraphNode>();
  for (const rn of rawNodes) nodes.set(rn.slug, coerceNode(rn));

  const adj = new Map<string, Array<{ edge: GraphEdge; to: string }>>();
  for (const n of rawNodes) adj.set(n.slug, []);

  const edges: GraphEdge[] = [];
  for (const re of rawEdges) {
    const edge = coerceEdge(re);
    edges.push(edge);
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;
    if (!edge.walkable) continue;
    // both directions
    adj.get(edge.from)!.push({ edge, to: edge.to });
    adj.get(edge.to)!.push({ edge, to: edge.from });
  }

  return { nodes, edges, adj };
}

/** Resolve the nearest walkable node slug to a given lat/lng. */
export function nearestNode(graph: Graph, lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const n of graph.nodes.values()) {
    const d = (n.lat - lat) ** 2 + (n.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n.slug;
    }
  }
  return best;
}
