// Turn-by-turn walking directions. Turns the router's node path into
// human-readable steps (head / continue / turn / arrive) using bearings,
// turn angles and landmark names from the graph.

import { bearing, haversine } from "../geo/geo";
import type {
  Cardinal,
  DirectionStep,
  Graph,
  GraphEdge,
  GraphNode,
  Maneuver,
  RouteResult,
} from "./types";

const CARDINALS: Cardinal[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function bearingToCardinal(brg: number): Cardinal {
  const idx = Math.round(((brg % 360) / 45)) % 8;
  return CARDINALS[(idx + 8) % 8];
}

/** Normalise a turn angle into (-180, 180]. */
function normaliseTurn(deg: number): number {
  let d = ((deg + 180) % 360) - 180;
  if (d <= -180) d += 360;
  return d;
}

function classifyTurn(delta: number): Maneuver {
  const d = normaliseTurn(delta);
  const a = Math.abs(d);
  if (a < 25) return "CONTINUE";
  if (a < 60) return d > 0 ? "TURN_RIGHT" : "TURN_LEFT";
  if (a < 110) return d > 0 ? "TURN_RIGHT" : "TURN_LEFT";
  return d > 0 ? "SHARP_RIGHT" : "SHARP_LEFT";
}

function maneuverVerb(m: Maneuver): string {
  switch (m) {
    case "DEPART":
      return "Head";
    case "CONTINUE":
      return "Continue";
    case "TURN_LEFT":
      return "Turn left";
    case "TURN_RIGHT":
      return "Turn right";
    case "SHARP_LEFT":
      return "Sharp left";
    case "SHARP_RIGHT":
      return "Sharp right";
    case "SLIGHT_LEFT":
      return "Bear left";
    case "SLIGHT_RIGHT":
      return "Bear right";
    case "STAIRS":
      return "Take the stairs";
    case "ARRIVE":
      return "Arrive";
  }
}

function nodeLabel(n: GraphNode | undefined): string | undefined {
  if (!n) return undefined;
  if (n.label) return n.label;
  if (n.locationSlug) return n.locationSlug.replace(/-/g, " ");
  return n.slug;
}

/**
 * Generate walking directions for a computed route.
 * Adjacent segments travelling in roughly the same direction are merged into
 * a single CONTINUE step so the user isn't spammed with "continue straight"
 * at every grid intersection.
 */
export function generateDirections(
  graph: Graph,
  route: RouteResult,
): DirectionStep[] {
  const steps: DirectionStep[] = [];
  const slugs = route.nodeSlugs;
  if (slugs.length < 2) return steps;

  const nodes = slugs.map((s) => graph.nodes.get(s)).filter(Boolean) as GraphNode[];
  // map of "from-to" -> edge (try both directions)
  const edgeLookup = new Map<string, GraphEdge>();
  for (const e of graph.edges) {
    edgeLookup.set(`${e.from}->${e.to}`, e);
    edgeLookup.set(`${e.to}->${e.from}`, e);
  }

  // bearings + per-segment meta
  const segs: Array<{
    from: GraphNode;
    to: GraphNode;
    brg: number;
    dist: number;
    edge: GraphEdge | undefined;
  }> = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const brg = bearing(
      { lat: a.lat, lng: a.lng },
      { lat: b.lat, lng: b.lng },
    );
    const dist = haversine({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
    const edge = edgeLookup.get(`${a.slug}->${b.slug}`);
    segs.push({ from: a, to: b, brg, dist, edge });
  }

  // Group consecutive segments with similar bearing into one step.
  // A new step starts when the turn angle vs the running bearing exceeds 25°,
  // OR when the segment is a STAIRS (always its own step), OR when passing a
  // named decision/landmark/gate node that's worth calling out.
  let groupStart = 0;
  let cumDist = 0;

  const isCallable = (n: GraphNode) =>
    n.kind === "DECISION" ||
    n.kind === "LANDMARK" ||
    n.kind === "GATE" ||
    !!n.locationSlug;

  const flush = (endIdx: number) => {
    if (endIdx < groupStart) return;
    const first = segs[groupStart];
    const last = segs[endIdx];
    let dist = 0;
    let hasStairs = false;
    for (let j = groupStart; j <= endIdx; j++) {
      dist += segs[j].dist;
      if (segs[j].edge?.roadType === "STEPS") hasStairs = true;
    }
    cumDist += dist;

    // Determine maneuver from the bearing delta vs the previous step's bearing
    let maneuver: Maneuver;
    let prevBearing: number | undefined;
    if (steps.length === 0) {
      maneuver = hasStairs ? "STAIRS" : "DEPART";
    } else {
      prevBearing = segs[groupStart - 1].brg;
      const delta = last.brg - (prevBearing ?? first.brg);
      maneuver = hasStairs ? "STAIRS" : classifyTurn(delta);
    }

    const dir = bearingToCardinal(first.brg);
    const endNode = last.to;
    const endLabel = nodeLabel(endNode);

    // Build instruction text
    let instr: string;
    if (maneuver === "DEPART") {
      const startName = nodeLabel(segs[groupStart].from);
      instr = `Head ${dir} on ${surfaceWord(first.edge)}${startName ? ` from ${startName}` : ""}`;
    } else if (maneuver === "ARRIVE") {
      instr = `Arrive at ${endLabel ?? "your destination"}`;
    } else if (maneuver === "STAIRS") {
      instr = `Take the stairs ${dir} toward ${endLabel ?? "the next path"}`;
    } else if (maneuver === "CONTINUE") {
      instr = `Continue ${dir} ${distLabel(dist)}${endLabel ? ` past ${endLabel}` : ""}`;
    } else {
      instr = `${maneuverVerb(maneuver)} at ${endLabel ?? "the next junction"}`;
    }

    steps.push({
      index: steps.length,
      instruction: instr,
      maneuver,
      distanceM: dist,
      cumulativeM: cumDist,
      direction: dir,
      endNodeSlug: endNode.slug,
      endLabel,
    });
  };

  for (let i = 0; i < segs.length; i++) {
    const cur = segs[i];
    const isStairs = cur.edge?.roadType === "STEPS";
    // decide whether to break the current group here
    const next = segs[i + 1];
    const breakAfter = i === segs.length - 1
      || isStairs
      || (next && (() => {
        const delta = normaliseTurn(next.brg - cur.brg);
        if (Math.abs(delta) >= 25) return true; // a turn
        if (next.edge?.roadType === "STEPS") return true;
        // call out named nodes mid-stride
        if (isCallable(cur.to) && cur.to.slug !== slugs[slugs.length - 1]) return true;
        return false;
      })());
    if (breakAfter) {
      flush(i);
      groupStart = i + 1;
    }
  }

  // ARRIVE step at the destination
  const dest = nodes[nodes.length - 1];
  steps.push({
    index: steps.length,
    instruction: `Arrive at ${nodeLabel(dest) ?? "your destination"}`,
    maneuver: "ARRIVE",
    distanceM: 0,
    cumulativeM: cumDist,
    direction: bearingToCardinal(segs[segs.length - 1].brg),
    endNodeSlug: dest.slug,
    endLabel: nodeLabel(dest),
  });

  // Merge a trailing CONTINUE that's tiny into the ARRIVE wording
  return steps;
}

function surfaceWord(edge?: GraphEdge): string {
  if (!edge) return "the path";
  switch (edge.roadType) {
    case "ROAD":
      return "the road";
    case "PATH":
      return edge.surfaceType === "DIRT" ? "the unpaved path" : "the path";
    case "INTERNAL":
      return "the internal walkway";
    case "SERVICE":
      return "the service road";
    case "BRIDGE":
      return "the bridge";
    case "STEPS":
      return "the steps";
  }
}

function distLabel(m: number): string {
  if (m < 20) return "";
  if (m < 1000) return `for ${Math.round(m / 10) * 10} m`;
  return `for ${(m / 1000).toFixed(1)} km`;
}

/** Icon name for a maneuver (maps to lucide icons in the UI). */
export function maneuverIcon(m: Maneuver): string {
  switch (m) {
    case "DEPART":
      return "footprints";
    case "CONTINUE":
      return "arrow-up";
    case "TURN_LEFT":
      return "arrow-up-left";
    case "TURN_RIGHT":
      return "arrow-up-right";
    case "SHARP_LEFT":
      return "corner-up-left";
    case "SHARP_RIGHT":
      return "corner-up-right";
    case "SLIGHT_LEFT":
      return "arrow-up-left";
    case "SLIGHT_RIGHT":
      return "arrow-up-right";
    case "STAIRS":
      return "stairs";
    case "ARRIVE":
      return "map-pin";
  }
}
