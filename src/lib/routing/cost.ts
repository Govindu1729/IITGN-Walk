// Cost functions for the IITGN walking router.
//
// Each objective maps an edge + walking mode to a scalar cost.
//   - FASTEST  -> predicted travel time (seconds)
//   - SHORTEST -> distance (metres)
//   - EASIEST  -> distance + penalties for slope/steps/darkness/traffic
//
// Walking speed is mode-dependent and (once data exists) campus-learned.

import {
  DEFAULT_SPEED_MPS,
  ROAD_TYPE_SPEED_FACTOR,
  type GraphEdge,
  type RouteObjective,
  type WalkingMode,
} from "./types";

/** Resolve the effective walking speed (m/s) for a mode. */
export function effectiveSpeed(
  mode: WalkingMode,
  learned?: Partial<Record<WalkingMode, number>>,
): number {
  return learned?.[mode] ?? DEFAULT_SPEED_MPS[mode];
}

/**
 * User-facing route customisation options.
 *
 * These are applied as MULTIPLIERS on edge costs so the chosen path *prefers*
 * (or *avoids*) certain edges while still routing the user from A to B.
 *
 * - `avoidShaded`: penalise edges with poor/partial lighting (avoids dark paths).
 * - `preferSheltered`: reward edges with `lighting === "GOOD"` (treated as a
 *   proxy for shelter from sun/rain — typically covered or tree-lined walks).
 * - `avoidCrowds`: reward edges with `trafficLevel === "LOW"`.
 *
 * Default multipliers below are deliberately moderate so the chosen path
 * remains close to the optimal-cost route while nudging toward the user's
 * preference.
 */
export interface RouteCustomization {
  avoidShaded?: boolean;
  preferSheltered?: boolean;
  avoidCrowds?: boolean;
}

const SHADED_PENALTY = 1.6; // edges with NONE/PARTIAL lighting
const SHELTERED_BONUS = 0.85; // edges with GOOD lighting
const LOW_CROWD_BONUS = 0.85; // edges with LOW traffic

/** Compute the customization multiplier (≥0, 1 = neutral) for an edge. */
export function customizationMultiplier(
  edge: GraphEdge,
  c?: RouteCustomization,
): number {
  if (!c) return 1;
  let m = 1;
  if (c.avoidShaded && (edge.lighting === "NONE" || edge.lighting === "PARTIAL")) {
    m *= SHADED_PENALTY;
  }
  if (c.preferSheltered && edge.lighting === "GOOD") {
    m *= SHELTERED_BONUS;
  }
  if (c.avoidCrowds && edge.trafficLevel === "LOW") {
    m *= LOW_CROWD_BONUS;
  }
  return m;
}

/** Predicted travel time (seconds) for an edge under a given mode. */
export function predictedEdgeTime(
  edge: GraphEdge,
  mode: WalkingMode,
  speed: number,
): number {
  if (!edge.walkable) return Infinity;
  const factor = ROAD_TYPE_SPEED_FACTOR[edge.roadType] ?? 1;
  let v = speed * factor;
  // slope penalty: uphill slows you proportionally, downhill slight gain up to a cap
  if (edge.slope) {
    if (edge.slope > 0) v *= 1 / (1 + edge.slope * 6); // ~6x slope effect
    else v *= 1 / (1 + edge.slope * -2); // mild downhill boost
  }
  // no-lighting small penalty at hurry mode (caution)
  if (edge.lighting === "NONE" && mode === "HURRY") v *= 0.95;
  // high traffic slows walking on roads (not paths)
  if (edge.trafficLevel === "HIGH" && edge.roadType === "ROAD") v *= 0.85;
  if (v <= 0.05) v = 0.05; // safety floor
  return edge.distanceM / v;
}

/** Easiest-route difficulty score for a single edge (0..100). */
export function edgeDifficulty(edge: GraphEdge): number {
  let d = 0;
  if (edge.roadType === "STEPS") d += 25;
  if (edge.roadType === "SERVICE") d += 8;
  if (edge.surfaceType === "DIRT") d += 8;
  if (edge.surfaceType === "GRASS") d += 10;
  if (edge.lighting === "NONE") d += 10;
  if (edge.lighting === "PARTIAL") d += 4;
  if (edge.trafficLevel === "HIGH") d += 12;
  if (edge.trafficLevel === "MEDIUM") d += 5;
  if (edge.slope) {
    d += Math.min(20, Math.abs(edge.slope) * 100);
  }
  return Math.min(100, d);
}

/** Aggregate route difficulty (0..100), length-weighted. */
export function routeDifficulty(
  edges: GraphEdge[],
  totalDistM: number,
): number {
  if (totalDistM === 0) return 0;
  let acc = 0;
  for (const e of edges) acc += edgeDifficulty(e) * e.distanceM;
  return Math.min(100, acc / totalDistM);
}

/**
 * Cost function factory. Returns (edge, mode, speed) -> cost (seconds or metres).
 *
 * For FASTEST we cost in seconds (predicted travel time).
 * For SHORTEST we cost in metres.
 * For EASIEST we cost in "difficulty-adjusted seconds" (a blend) so the path
 * minimises physical effort + time.
 *
 * `customization` lets the user nudge the router toward sheltered / low-traffic
 * edges or away from shaded ones — applied as a multiplier on top of the base
 * cost so it works for all three objectives.
 */
export function makeCostFn(
  objective: RouteObjective,
  penaltyEdges: Set<string> = new Set(),
  penaltyMultiplier = 3,
  customization?: RouteCustomization,
) {
  return (edge: GraphEdge, mode: WalkingMode, speed: number): number => {
    if (penaltyEdges.has(edge.slug)) {
      // penalised edge — used to find alternatives that avoid the fastest route
    }
    const penalty = penaltyEdges.has(edge.slug) ? penaltyMultiplier : 1;
    const customMul = customizationMultiplier(edge, customization);
    const combined = penalty * customMul;
    switch (objective) {
      case "FASTEST":
        return predictedEdgeTime(edge, mode, speed) * combined;
      case "SHORTEST":
        return edge.distanceM * combined;
      case "EASIEST": {
        const t = predictedEdgeTime(edge, mode, speed);
        const diff = edgeDifficulty(edge);
        // Difficulty is a MULTIPLICATIVE surcharge on time so that a hard edge
        // (steps / dirt / dark / steep) is reliably costlier than a slightly
        // longer but comfortable edge — even when learned speeds shift.
        // diff=0  -> time × 1.00 (no penalty)
        // diff=41 (steps+partial+slope) -> time × 2.02
        // diff=100 -> time × 3.50
        return (t * (1 + diff / 40)) * combined;
      }
    }
  };
}

export type CostFn = ReturnType<typeof makeCostFn>;
