// Multi-objective router. Computes FASTEST / SHORTEST / EASIEST routes and
// one ALTERNATIVE (the fastest route avoiding the fastest route's edges).
//
// Routing logic lives here, NOT in React. The UI just calls computeRoutes().
// Swapping in a more advanced engine (e.g. CH/MLD) only requires reimplementing
// the single-path solver used by computeRoutes().

import { haversine, pathLengthM, formatEta } from "../geo/geo";
import {
  effectiveSpeed,
  makeCostFn,
  predictedEdgeTime,
  routeDifficulty,
  type RouteCustomization,
} from "./cost";
import { astar } from "./astar";
import type { Graph } from "./types";
import {
  DEFAULT_SPEED_MPS,
  type GraphEdge,
  type MultiRouteResult,
  type RouteObjective,
  type RouteResult,
  type WalkingMode,
} from "./types";

export interface RouteRequest {
  fromLocation?: string;
  toLocation?: string;
  fromCoord?: { lat: number; lng: number };
  toCoord?: { lat: number; lng: number };
  mode: WalkingMode;
  /** User route customisation (avoid shaded / prefer sheltered / avoid crowds). */
  customization?: RouteCustomization;
  /**
   * Optional intermediate location slug (legacy single via point).
   * @deprecated Use `viaLocations` instead — this is merged into the array
   *   at the front (if not already present) for backward compatibility.
   */
  viaLocation?: string;
  /**
   * Ordered list of intermediate location slugs (waypoints) the route must
   * pass through. Up to 3 are honoured by the planner; the router accepts
   * any length but stops at the first via that fails to resolve.
   */
  viaLocations?: string[];
}

/**
 * Resolve the effective ordered via list, merging the legacy single
 * `viaLocation` into `viaLocations` (deduplicated, `viaLocation` first).
 * Returns the original slugs (NOT node slugs) in traversal order.
 */
function resolveViaList(req: RouteRequest): string[] {
  const arr = Array.isArray(req.viaLocations) ? req.viaLocations.slice() : [];
  if (req.viaLocation && !arr.includes(req.viaLocation)) {
    arr.unshift(req.viaLocation);
  }
  return arr;
}

/** Resolve a location slug to its entrance node slug. */
function locationToNodeSlug(slug: string): string {
  return `ENT-${slug}`;
}

/** Build a RouteResult from a path of node slugs. */
function assembleRoute(
  graph: Graph,
  path: string[],
  edgeSlugs: string[],
  objective: RouteObjective,
  req: RouteRequest,
  speed: number,
  learned?: Partial<Record<WalkingMode, number>>,
): RouteResult | null {
  if (path.length === 0) return null;
  const nodes = path.map((s) => graph.nodes.get(s)).filter(Boolean) as {
    lng: number;
    lat: number;
    slug: string;
  }[];
  if (nodes.length === 0) return null;

  const pathCoords: [number, number][] = nodes.map((n) => [n.lng, n.lat] as [number, number]);

  // Collect the actual GraphEdge objects traversed (in order)
  const edgesTraversed: GraphEdge[] = [];
  for (let i = 0; i < edgeSlugs.length; i++) {
    const found = graph.edges.find((e) => e.slug === edgeSlugs[i]);
    if (found) edgesTraversed.push(found);
  }

  // Distance: prefer sum of edge distances (authoritative graph metric),
  // fall back to path length if any edges are missing.
  let distanceM = edgesTraversed.reduce((s, e) => s + e.distanceM, 0);
  if (distanceM === 0) distanceM = pathLengthM(pathCoords);

  // Duration: recompute predicted travel time using mode speed (more accurate
  // than per-edge estTimeSec which was normalised to NORMAL).
  let durationS = 0;
  for (const e of edgesTraversed) {
    durationS += predictedEdgeTime(e, req.mode, speed);
  }
  if (durationS === 0) durationS = distanceM / speed;

  const difficulty = routeDifficulty(edgesTraversed, distanceM);
  const eta = new Date(Date.now() + durationS * 1000).toISOString();

  const reason = explainRoute(objective, edgesTraversed, durationS, distanceM);

  return {
    objective,
    fromLocation: req.fromLocation,
    toLocation: req.toLocation,
    mode: req.mode,
    path: pathCoords,
    nodeSlugs: path,
    distanceM,
    durationS,
    eta,
    difficulty,
    reason,
    speedMps: speed,
  };
}

function explainRoute(
  objective: RouteObjective,
  edges: GraphEdge[],
  durationS: number,
  distanceM: number,
): string {
  const mins = Math.round(durationS / 60);
  const hasSteps = edges.some((e) => e.roadType === "STEPS");
  const hasDirt = edges.some((e) => e.surfaceType === "DIRT" || e.surfaceType === "GRASS");
  const fullyLit = edges.every((e) => e.lighting === "GOOD" || e.lighting === "PARTIAL");
  const maxSlope = edges.reduce((m, e) => Math.max(m, Math.abs(e.slope ?? 0)), 0);
  const hasHighTraffic = edges.some((e) => e.trafficLevel === "HIGH");
  switch (objective) {
    case "FASTEST": {
      const bits: string[] = [`lowest predicted time (${mins} min)`];
      if (!hasSteps) bits.push("no steps");
      if (!hasHighTraffic) bits.push("avoids busy roads");
      bits.push("mode-aware ETA");
      return `Fastest by ${bits.join(", ")}.`;
    }
    case "SHORTEST": {
      const bits: string[] = [`fewest metres (${(distanceM / 1000).toFixed(2)} km)`];
      if (hasSteps) bits.push("uses a stair shortcut");
      if (hasDirt) bits.push("unpaved section");
      bits.push("not always the fastest");
      return `Shortest by ${bits.join(", ")}.`;
    }
    case "EASIEST": {
      const bits: string[] = [];
      if (!hasSteps) bits.push("no steps");
      if (!hasDirt) bits.push("fully paved");
      if (fullyLit) bits.push("well lit");
      if (maxSlope < 0.08) bits.push("gentle gradient");
      else bits.push("minimal slope");
      if (!hasHighTraffic) bits.push("low traffic");
      bits.push(`difficulty ${Math.round(routeDifficulty(edges, distanceM))}/100`);
      return `Easiest — ${bits.join(", ")}.`;
    }
  }
}

/**
 * Run A* from `start` to `goal` for the given objective, applying the
 * user's customisation multipliers and (optionally) penalty edges used to
 * find alternatives. Returns the raw {path, edges, cost} result or null.
 */
function solveObjective(
  graph: Graph,
  start: string,
  goal: string,
  objective: RouteObjective,
  mode: WalkingMode,
  speed: number,
  customization: RouteCustomization | undefined,
  penaltyEdges?: Set<string>,
  penaltyMultiplier?: number,
) {
  const cost = makeCostFn(objective, penaltyEdges, penaltyMultiplier, customization);
  return astar(graph, start, goal, cost, mode, speed);
}

/**
 * Concatenate two A* results (leg1: A→B, leg2: B→C) into a single path/edge
 * list, dropping the duplicated junction node at the seam.
 *
 * Returns null if either leg is null.
 */
function concatLegs(
  leg1: { path: string[]; edges: string[] } | null,
  leg2: { path: string[]; edges: string[] } | null,
): { path: string[]; edges: string[] } | null {
  if (!leg1 || !leg2) return null;
  // leg1.path ends at the via node, leg2.path starts at the via node — drop the duplicate.
  const path = leg2.path.length > 0
    ? [...leg1.path, ...leg2.path.slice(1)]
    : leg1.path;
  const edges = [...leg1.edges, ...leg2.edges];
  return { path, edges };
}

/**
 * Concatenate an arbitrary number of A* legs into a single path/edge list,
 * dropping the duplicated junction node at every seam (each leg ends where
 * the next begins). Returns null if ANY leg is null (so callers can fall
 * back to the direct A* result). An empty leg list also returns null.
 */
function concatLegsAll(
  legs: Array<{ path: string[]; edges: string[] } | null>,
): { path: string[]; edges: string[] } | null {
  if (legs.length === 0) return null;
  let acc: { path: string[]; edges: string[] } | null = legs[0];
  for (let i = 1; i < legs.length; i++) {
    if (!acc || !legs[i]) return null;
    acc = concatLegs(acc, legs[i]);
  }
  return acc;
}

/**
 * Compute fastest / shortest / easiest / alternative routes for a request.
 *
 * The "alternative" path is found by penalising the edges of the FASTEST path
 * and re-running A* — this yields a meaningfully-different second-best route
 * when one exists (Yen's k-shortest is overkill for an MVP).
 *
 * If `req.viaLocations` (or the legacy `req.viaLocation`) is set, every
 * objective is solved as N+1 legs (start→V1, V1→V2, …, Vn→goal) and the
 * resulting paths/edges are concatenated (seam nodes deduplicated) so the
 * recommended route passes through every waypoint in order.
 */
export function computeRoutes(
  graph: Graph,
  req: RouteRequest,
  learned?: Partial<Record<WalkingMode, number>>,
): MultiRouteResult {
  // Resolve start/goal nodes
  let startSlug: string | undefined;
  let goalSlug: string | undefined;
  if (req.fromLocation) startSlug = locationToNodeSlug(req.fromLocation);
  else if (req.fromCoord) startSlug = nearestNodeLocal(graph, req.fromCoord);
  if (req.toLocation) goalSlug = locationToNodeSlug(req.toLocation);
  else if (req.toCoord) goalSlug = nearestNodeLocal(graph, req.toCoord);

  if (!startSlug || !goalSlug) return { speedMps: 0 };
  if (!graph.nodes.has(startSlug) || !graph.nodes.has(goalSlug))
    return { speedMps: 0 };

  // Resolve ordered via nodes — merge the legacy single `viaLocation` into
  // `viaLocations` (deduplicated, viaLocation first). Skip any via that
  // doesn't resolve to a real entrance node in the graph.
  const viaLocationSlugs = resolveViaList(req).filter(
    (s, i, arr) => s && arr.indexOf(s) === i,
  );
  const viaSlugs: string[] = [];
  for (const v of viaLocationSlugs) {
    const nodeSlug = locationToNodeSlug(v);
    if (graph.nodes.has(nodeSlug) && nodeSlug !== startSlug && nodeSlug !== goalSlug) {
      viaSlugs.push(nodeSlug);
    }
  }

  const speed = effectiveSpeed(req.mode, learned);
  const customization = req.customization;

  // Pre-compute the ordered list of leg endpoints: [start, V1, V2, ..., Vn, goal].
  // If viaSlugs is empty this is just [start, goal] and legs collapses to one A* call.
  const legEndpoints = [startSlug, ...viaSlugs, goalSlug];

  /**
   * Solve a single objective across all N+1 legs and concat the results.
   * Returns null if any leg fails to find a path.
   */
  const solveObjectiveMulti = (
    objective: RouteObjective,
    penaltyEdges?: Set<string>,
    penaltyMultiplier?: number,
  ): { path: string[]; edges: string[] } | null => {
    if (legEndpoints.length <= 2) {
      return solveObjective(
        graph,
        legEndpoints[0],
        legEndpoints[1],
        objective,
        req.mode,
        speed,
        customization,
        penaltyEdges,
        penaltyMultiplier,
      );
    }
    const legs: Array<{ path: string[]; edges: string[] } | null> = [];
    for (let i = 0; i < legEndpoints.length - 1; i++) {
      legs.push(
        solveObjective(
          graph,
          legEndpoints[i],
          legEndpoints[i + 1],
          objective,
          req.mode,
          speed,
          customization,
          penaltyEdges,
          penaltyMultiplier,
        ),
      );
    }
    return concatLegsAll(legs);
  };

  // FASTEST
  let fastest: RouteResult | null = null;
  let fastestEdges = new Set<string>();
  const fastestRaw = solveObjectiveMulti("FASTEST");
  if (fastestRaw) {
    fastest = assembleRoute(graph, fastestRaw.path, fastestRaw.edges, "FASTEST", req, speed, learned);
    if (viaSlugs.length > 0 && fastest) {
      fastest.reason = `${fastest.reason} ${viaReasonText(graph, viaLocationSlugs)}`;
    }
    fastestEdges = new Set(fastestRaw.edges);
  }

  // SHORTEST — keep the raw path for the alternative comparison.
  const shortestRaw = solveObjectiveMulti("SHORTEST");
  let shortest: RouteResult | null = null;
  if (shortestRaw) {
    shortest = assembleRoute(graph, shortestRaw.path, shortestRaw.edges, "SHORTEST", req, speed, learned);
    if (viaSlugs.length > 0 && shortest) {
      shortest.reason = `${shortest.reason} ${viaReasonText(graph, viaLocationSlugs)}`;
    }
  }

  // EASIEST — keep the raw path for the alternative comparison.
  const easiestRaw = solveObjectiveMulti("EASIEST");
  let easiest: RouteResult | null = null;
  if (easiestRaw) {
    easiest = assembleRoute(graph, easiestRaw.path, easiestRaw.edges, "EASIEST", req, speed, learned);
    if (viaSlugs.length > 0 && easiest) {
      easiest.reason = `${easiest.reason} ${viaReasonText(graph, viaLocationSlugs)}`;
    }
  }

  // ALTERNATIVE — penalise the fastest path's edges and re-run fastest-cost A*
  let alternative: RouteResult | undefined;
  if (fastestEdges.size > 0) {
    const altRaw = solveObjectiveMulti("FASTEST", fastestEdges, 4);
    if (altRaw) {
      // only show as alternative if it is meaningfully different
      const sameAsFastest =
        JSON.stringify(altRaw.path) === JSON.stringify(fastestRaw?.path);
      const sameAsShortest =
        JSON.stringify(altRaw.path) === JSON.stringify(shortestRaw?.path);
      const sameAsEasiest =
        JSON.stringify(altRaw.path) === JSON.stringify(easiestRaw?.path);
      if (!sameAsFastest && !sameAsShortest && !sameAsEasiest) {
        const alt = assembleRoute(graph, altRaw.path, altRaw.edges, "FASTEST", req, speed, learned);
        if (alt) {
          alt.objective = "FASTEST";
          const viaText = viaSlugs.length > 0
            ? ` ${viaReasonText(graph, viaLocationSlugs)}`
            : "";
          alt.reason = `Alternative ${Math.round(alt.durationS / 60)} min route avoiding the fastest path's main roads.${viaText}`;
          alternative = alt;
        }
      }
    }
  }

  return {
    fastest: fastest ?? undefined,
    shortest: shortest ?? undefined,
    easiest: easiest ?? undefined,
    alternative: alternative ?? undefined,
    speedMps: speed,
  };
}

/**
 * Build the "Routes via Library, Dining Hall." suffix used in route reasons.
 * Resolves each location slug to its friendly name via the entrance node's
 * `label` (set by `buildEntranceNodes`); falls back to the raw slug.
 */
function viaReasonText(graph: Graph, viaLocationSlugs: string[]): string {
  if (viaLocationSlugs.length === 0) return "";
  const names = viaLocationSlugs.map((slug) => {
    const node = graph.nodes.get(locationToNodeSlug(slug));
    return node?.label ?? slug;
  });
  return `Routes via ${names.join(", ")}.`;
}

function nearestNodeLocal(graph: Graph, coord: { lat: number; lng: number }): string | undefined {
  let best: string | undefined;
  let bestD = Infinity;
  for (const n of graph.nodes.values()) {
    const d = haversine({ lat: n.lat, lng: n.lng }, coord);
    if (d < bestD) {
      bestD = d;
      best = n.slug;
    }
  }
  return best;
}

/** Compute ETA string given a duration in seconds. */
export function computeEta(durationS: number): string {
  return formatEta(new Date(Date.now() + durationS * 1000).toISOString());
}

export { DEFAULT_SPEED_MPS };
