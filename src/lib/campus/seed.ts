// IIT Gandhinagar campus seed dataset.
//
// !! SEED DATA — MANUALLY ENTERED !!
// This dataset is a representative reconstruction of the IITGN campus layout
// (Palaj, Gandhinagar, Gujarat) intended to make the MVP work end-to-end.
// Coordinates are placed on a realistic local grid around the documented
// campus centre and MUST be replaced by verified geospatial data (GPS survey
// or the official campus CAD/shapefile) before production use.
//
// The architecture is deliberately split so the *map* (CampusFeature) and
// the *routing graph* (RoadNode/RoadEdge) are independent datasets — you can
// re-survey one without touching the other.

import { haversine } from "../geo/geo";
import {
  DEFAULT_SPEED_MPS,
  type EdgeRoadType,
  type GraphEdge,
  type GraphNode,
  type Lighting,
  type Surface,
  type TrafficLevel,
  type WalkingMode,
} from "../routing/types";

/** Documented IITGN campus centre (Palaj, Gandhinagar). */
export const CAMPUS_CENTER = { lat: 23.21, lng: 72.685 };

const M_PER_LAT = 111320;
const M_PER_LNG = 111320 * Math.cos((CAMPUS_CENTER.lat * Math.PI) / 180);

/** Convert a local east/north offset (metres) to {lat,lng}. */
export function toLatLng(eastM: number, northM: number) {
  return {
    lat: CAMPUS_CENTER.lat + northM / M_PER_LAT,
    lng: CAMPUS_CENTER.lng + eastM / M_PER_LNG,
  };
}

/** Campus bounding box in lat/lng (used by the map to fitBounds). */
export const CAMPUS_BOUNDS = {
  // ~520m west, 460m south, 360m east, 300m north of centre
  sw: toLatLng(-540, -480),
  ne: toLatLng(360, 300),
};

// ---------------------------------------------------------------------------
// LOCATIONS — campus points of interest (hostels, academic, facilities, gates)
// ---------------------------------------------------------------------------
// Each location is placed on the local grid; `entry` is the junction node slug
// the location connects to via a short entrance edge.

export interface SeedLocation {
  slug: string;
  name: string;
  category:
    | "HOSTEL"
    | "ACADEMIC"
    | "CLASSROOM"
    | "LAB"
    | "LIBRARY"
    | "SPORTS"
    | "DINING"
    | "ADMIN"
    | "GATE"
    | "LANDMARK"
    | "OTHER";
  east: number;
  north: number;
  entry: string; // junction node slug
  notes?: string;
}

export const SEED_LOCATIONS: SeedLocation[] = [
  // --- Gates ---
  { slug: "main-gate", name: "Main Gate", category: "GATE", east: 0, north: -450, entry: "J-MG", notes: "Palaj-side main vehicular gate" },
  { slug: "north-gate", name: "North Gate", category: "GATE", east: 0, north: 270, entry: "J-NG", notes: "Back gate toward residential colony" },
  { slug: "east-gate", name: "East Gate", category: "GATE", east: 310, north: 10, entry: "J-E3", notes: "Pedestrian gate, east perimeter" },

  // --- Hostels (south cluster) ---
  { slug: "hostel-1", name: "Hostel 1", category: "HOSTEL", east: -280, north: -310, entry: "J-C1" },
  { slug: "hostel-2", name: "Hostel 2", category: "HOSTEL", east: -140, north: -310, entry: "J-C2" },
  { slug: "hostel-3", name: "Hostel 3", category: "HOSTEL", east: 0, north: -310, entry: "J-C3" },
  { slug: "hostel-4", name: "Hostel 4", category: "HOSTEL", east: 140, north: -310, entry: "J-C4" },
  { slug: "hostel-5", name: "Hostel 5", category: "HOSTEL", east: -280, north: -210, entry: "J-C5" },
  { slug: "hostel-6", name: "Hostel 6", category: "HOSTEL", east: -140, north: -210, entry: "J-C6" },
  { slug: "hostel-7", name: "Hostel 7", category: "HOSTEL", east: 140, north: -210, entry: "J-C8" },

  // --- Dining ---
  { slug: "dining-hall", name: "Dining Hall (Mess)", category: "DINING", east: -70, north: -260, entry: "J-C2a", notes: "Central mess serving hostels" },
  { slug: "shopping-complex", name: "Shopping Complex (Amul)", category: "LANDMARK", east: -70, north: -160, entry: "J-C6a" },

  // --- Sports ---
  { slug: "sports-complex", name: "Sports Complex (Gym)", category: "SPORTS", east: -410, north: -40, entry: "J-W3" },
  { slug: "football-ground", name: "Football / Cricket Ground", category: "SPORTS", east: -410, north: 90, entry: "J-W5" },
  { slug: "tennis-courts", name: "Tennis & Basketball Courts", category: "SPORTS", east: -410, north: -160, entry: "J-W2" },

  // --- Academic area (north cluster) ---
  { slug: "lhc", name: "Lecture Hall Complex (LHC)", category: "CLASSROOM", east: 0, north: 10, entry: "J-C10a", notes: "Central classrooms" },
  { slug: "ab1", name: "Academic Block 1 (AB1)", category: "ACADEMIC", east: -220, north: 90, entry: "J-C17" },
  { slug: "ab2", name: "Academic Block 2 (AB2)", category: "ACADEMIC", east: -110, north: 90, entry: "J-C18" },
  { slug: "ab3", name: "Academic Block 3 (AB3 / Labs)", category: "LAB", east: 0, north: 90, entry: "J-C19" },
  { slug: "ab4", name: "Academic Block 4 (AB4)", category: "ACADEMIC", east: 110, north: 90, entry: "J-C20" },
  { slug: "ab5", name: "Academic Block 5 (AB5)", category: "ACADEMIC", east: 220, north: 90, entry: "J-C17x" },
  { slug: "library", name: "Library & Learning Resource Centre", category: "LIBRARY", east: 0, north: 175, entry: "J-C21" },
  { slug: "computer-centre", name: "Computer Centre", category: "LAB", east: 110, north: 175, entry: "J-C22" },

  // --- Admin & services ---
  { slug: "admin-block", name: "Administration Block", category: "ADMIN", east: 260, north: -40, entry: "J-E3" },
  { slug: "health-centre", name: "Health Centre", category: "OTHER", east: 260, north: -160, entry: "J-E2" },

  // --- Landmarks ---
  { slug: "central-plaza", name: "Central Plaza (Quad)", category: "LANDMARK", east: 0, north: -40, entry: "J-C11" },
  { slug: "amphitheatre", name: "Amphitheatre", category: "LANDMARK", east: -70, north: 30, entry: "J-C14" },
];

// ---------------------------------------------------------------------------
// JUNCTIONS — the walking network's intersection / decision nodes
// ---------------------------------------------------------------------------

export interface SeedJunction {
  slug: string;
  east: number;
  north: number;
  kind: GraphNode["kind"];
  label?: string;
}

export const SEED_JUNCTIONS: SeedJunction[] = [
  // Perimeter
  { slug: "J-MG", east: 0, north: -450, kind: "GATE", label: "Main Gate Junction" },
  { slug: "J-SW", east: -410, north: -450, kind: "INTERSECTION", label: "SW Corner" },
  { slug: "J-SE", east: 310, north: -450, kind: "INTERSECTION", label: "SE Corner" },
  { slug: "J-S1", east: -220, north: -370, kind: "INTERSECTION" },
  { slug: "J-S2", east: 0, north: -370, kind: "INTERSECTION", label: "South Spine" },
  { slug: "J-S3", east: 70, north: -370, kind: "INTERSECTION" },
  { slug: "J-S4", east: 260, north: -370, kind: "INTERSECTION" },

  // West perimeter
  { slug: "J-W1", east: -410, north: -270, kind: "INTERSECTION" },
  { slug: "J-W2", east: -410, north: -170, kind: "INTERSECTION", label: "Courts Junction" },
  { slug: "J-W3", east: -410, north: -40, kind: "INTERSECTION", label: "Sports Complex Junction" },
  { slug: "J-W4", east: -410, north: 30, kind: "INTERSECTION" },
  { slug: "J-W5", east: -410, north: 90, kind: "INTERSECTION", label: "Ground Junction" },
  { slug: "J-W6", east: -410, north: 175, kind: "INTERSECTION" },

  // East perimeter
  { slug: "J-E1", east: 310, north: -270, kind: "INTERSECTION" },
  { slug: "J-E2", east: 310, north: -170, kind: "INTERSECTION", label: "Health Centre Junction" },
  { slug: "J-E3", east: 310, north: 10, kind: "INTERSECTION", label: "East Gate Junction" },
  { slug: "J-E4", east: 310, north: 90, kind: "INTERSECTION" },
  { slug: "J-E5", east: 310, north: 175, kind: "INTERSECTION" },

  // North perimeter
  { slug: "J-NW", east: -410, north: 270, kind: "INTERSECTION", label: "NW Corner" },
  { slug: "J-NE", east: 310, north: 270, kind: "INTERSECTION", label: "NE Corner" },
  { slug: "J-NG", east: 0, north: 270, kind: "GATE", label: "North Gate Junction" },

  // Internal grid — hostel spine (rows at north = -270, -170, -70, 30)
  { slug: "J-C1", east: -220, north: -270, kind: "INTERSECTION", label: "H1/H5 Junction" },
  { slug: "J-C2", east: -70, north: -270, kind: "INTERSECTION", label: "Dining Junction" },
  { slug: "J-C2a", east: -70, north: -260, kind: "DECISION", label: "Dining Hall Entry" },
  { slug: "J-C3", east: 70, north: -270, kind: "INTERSECTION", label: "H3 Junction" },
  { slug: "J-C4", east: 200, north: -270, kind: "INTERSECTION", label: "H4 Junction" },

  { slug: "J-C5", east: -220, north: -170, kind: "INTERSECTION", label: "H5 Junction" },
  { slug: "J-C6", east: -70, north: -170, kind: "INTERSECTION", label: "Shopping Junction" },
  { slug: "J-C6a", east: -70, north: -160, kind: "DECISION", label: "Shopping Entry" },
  { slug: "J-C7", east: 70, north: -170, kind: "INTERSECTION" },
  { slug: "J-C8", east: 200, north: -170, kind: "INTERSECTION", label: "H7 Junction" },

  { slug: "J-C9", east: -220, north: -70, kind: "INTERSECTION" },
  { slug: "J-C10", east: -70, north: -70, kind: "INTERSECTION", label: "Plaza West" },
  { slug: "J-C10a", east: 0, north: 0, kind: "DECISION", label: "LHC Entry" },
  { slug: "J-C11", east: 0, north: -40, kind: "LANDMARK", label: "Central Plaza" },
  { slug: "J-C12", east: 200, north: -70, kind: "INTERSECTION" },

  { slug: "J-C13", east: -220, north: 30, kind: "INTERSECTION" },
  { slug: "J-C14", east: -70, north: 30, kind: "INTERSECTION", label: "Amphitheatre Junction" },
  { slug: "J-C15", east: 70, north: 30, kind: "INTERSECTION" },
  { slug: "J-C16", east: 200, north: 30, kind: "INTERSECTION" },

  { slug: "J-C17", east: -220, north: 90, kind: "INTERSECTION", label: "AB1 Junction" },
  { slug: "J-C17x", east: 220, north: 90, kind: "INTERSECTION", label: "AB5 Junction" },
  { slug: "J-C18", east: -110, north: 90, kind: "INTERSECTION", label: "AB2 Junction" },
  { slug: "J-C19", east: 0, north: 90, kind: "INTERSECTION", label: "AB3 Junction" },
  { slug: "J-C20", east: 110, north: 90, kind: "INTERSECTION", label: "AB4 Junction" },

  { slug: "J-C21", east: -70, north: 175, kind: "INTERSECTION", label: "Library Junction" },
  { slug: "J-C22", east: 70, north: 175, kind: "INTERSECTION", label: "Computer Centre Junction" },
];

// ---------------------------------------------------------------------------
// EDGES — walkable connections between junctions
// ---------------------------------------------------------------------------
// Defined as ordered pairs [from, to, roadType, opts]. The router treats
// every edge as bidirectional (the graph builder adds both directions).

export interface SeedEdgeDef {
  from: string;
  to: string;
  roadType: EdgeRoadType;
  lighting?: Lighting;
  surface?: Surface;
  slope?: number;
  traffic?: TrafficLevel;
  walkable?: boolean;
  notes?: string;
}

// Helper to keep the edge list compact
function e(
  from: string,
  to: string,
  roadType: EdgeRoadType = "PATH",
  opts: Partial<SeedEdgeDef> = {},
): SeedEdgeDef {
  return { from, to, roadType, ...opts };
}

const baseLighting: Lighting = "GOOD";
const baseSurface: Surface = "CONCRETE";

export const SEED_EDGES: SeedEdgeDef[] = [
  // --- Perimeter loop (road, lit, asphalt) ---
  e("J-MG", "J-SW", "ROAD", { lighting: "GOOD", surface: "ASPHALT", traffic: "MEDIUM" }),
  e("J-MG", "J-S2", "ROAD", { lighting: "GOOD", surface: "ASPHALT", traffic: "MEDIUM" }),
  e("J-MG", "J-SE", "ROAD", { lighting: "GOOD", surface: "ASPHALT", traffic: "MEDIUM" }),
  e("J-S2", "J-S1", "ROAD", { lighting: baseLighting, surface: "ASPHALT", traffic: "LOW" }),
  e("J-S2", "J-S3", "ROAD", { lighting: baseLighting, surface: "ASPHALT", traffic: "LOW" }),
  e("J-S1", "J-SW", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),
  e("J-S3", "J-S4", "ROAD", { lighting: baseLighting, surface: "ASPHALT", traffic: "LOW" }),
  e("J-S4", "J-SE", "ROAD", { lighting: baseLighting, surface: "ASPHALT", traffic: "LOW" }),

  // West perimeter
  e("J-SW", "J-W1", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),
  e("J-W1", "J-W2", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),
  e("J-W2", "J-W3", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),
  e("J-W3", "J-W4", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-W4", "J-W5", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-W5", "J-W6", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-W6", "J-NW", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),

  // East perimeter
  e("J-SE", "J-E1", "ROAD", { lighting: baseLighting, surface: "ASPHALT", traffic: "LOW" }),
  e("J-E1", "J-E2", "ROAD", { lighting: baseLighting, surface: "ASPHALT", traffic: "LOW" }),
  e("J-E2", "J-E3", "ROAD", { lighting: baseLighting, surface: "ASPHALT", traffic: "LOW" }),
  e("J-E3", "J-E4", "ROAD", { lighting: baseLighting, surface: "ASPHALT", traffic: "LOW" }),
  e("J-E4", "J-E5", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-E5", "J-NE", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),

  // North perimeter
  e("J-NW", "J-NG", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),
  e("J-NG", "J-NE", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),

  // --- Internal spines (north-south) ---
  // West spine: quiet, well-lit concrete — the "fastest" baseline
  e("J-C1", "J-C5", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW" }),
  e("J-C5", "J-C9", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW" }),
  e("J-C9", "J-C13", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW" }),
  e("J-C13", "J-C17", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW", slope: 0.06 }),

  // Central spine: main thoroughfare — heavier foot traffic during class
  // changes; slightly slower effective speed but the most direct line.
  e("J-C2", "J-C6", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "MEDIUM" }),
  e("J-C6", "J-C10", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "MEDIUM" }),
  e("J-C10", "J-C14", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "MEDIUM" }),
  e("J-C14", "J-C18", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "MEDIUM", slope: 0.07 }),
  e("J-C18", "J-C21", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "MEDIUM", slope: 0.08 }),

  e("J-C3", "J-C7", "PATH", { lighting: "PARTIAL", surface: "CONCRETE", traffic: "LOW" }),
  e("J-C7", "J-C11", "PATH", { lighting: "PARTIAL", surface: "CONCRETE", traffic: "LOW" }),
  e("J-C11", "J-C15", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW" }),
  e("J-C15", "J-C19", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW", slope: 0.07 }),
  e("J-C19", "J-C22", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW", slope: 0.08 }),

  e("J-C4", "J-C8", "PATH", { lighting: "PARTIAL", surface: "DIRT", traffic: "LOW", notes: "unpaved shortcut" }),
  e("J-C8", "J-C12", "PATH", { lighting: "PARTIAL", surface: "DIRT", traffic: "LOW" }),
  e("J-C12", "J-C16", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW" }),
  e("J-C16", "J-C20", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW", slope: 0.07 }),

  // --- Internal spines (east-west) ---
  e("J-C1", "J-C2", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C2", "J-C2a", "PATH", { lighting: baseLighting, surface: baseSurface, notes: "to dining hall" }),
  e("J-C2a", "J-C3", "PATH", { lighting: baseLighting, surface: baseSurface, notes: "dining to plaza spine" }),
  e("J-C3", "J-C4", "PATH", { lighting: baseLighting, surface: baseSurface }),

  e("J-C5", "J-C6", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C6", "J-C6a", "PATH", { lighting: baseLighting, surface: baseSurface, notes: "to shopping" }),
  e("J-C6a", "J-C7", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C7", "J-C8", "PATH", { lighting: baseLighting, surface: baseSurface }),

  e("J-C9", "J-C10", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C10", "J-C10a", "PATH", { lighting: baseLighting, surface: baseSurface, notes: "to LHC" }),
  e("J-C10a", "J-C11", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C11", "J-C12", "PATH", { lighting: baseLighting, surface: baseSurface }),

  e("J-C13", "J-C14", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C14", "J-C15", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C15", "J-C16", "PATH", { lighting: baseLighting, surface: baseSurface }),

  e("J-C17", "J-C18", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C18", "J-C19", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C19", "J-C20", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C20", "J-C17x", "PATH", { lighting: baseLighting, surface: baseSurface }),

  e("J-C21", "J-C22", "PATH", { lighting: baseLighting, surface: baseSurface }),

  // --- Connect internal spines to perimeter ---
  e("J-C1", "J-W1", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-C4", "J-S4", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C5", "J-W1", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-C8", "J-E1", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C9", "J-W2", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-C12", "J-E2", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C13", "J-W3", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-C16", "J-E3", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C17", "J-W4", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-C17x", "J-E4", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C21", "J-W6", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-C22", "J-E5", "PATH", { lighting: baseLighting, surface: baseSurface }),
  e("J-C17", "J-NW", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),
  e("J-C17x", "J-NE", "ROAD", { lighting: "PARTIAL", surface: "ASPHALT", traffic: "LOW" }),
  e("J-C21", "J-NG", "PATH", { lighting: "PARTIAL", surface: baseSurface }),
  e("J-C22", "J-NG", "PATH", { lighting: "PARTIAL", surface: baseSurface }),

  // --- Connect south spine to hostel-area perimeter ---
  e("J-S1", "J-C1", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW" }),
  e("J-S3", "J-C3", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "LOW" }),
  e("J-S4", "J-C4", "PATH", { lighting: "PARTIAL", surface: "DIRT", traffic: "LOW" }),
  e("J-S2", "J-C2", "PATH", { lighting: "GOOD", surface: "CONCRETE", traffic: "MEDIUM" }),

  // --- Short entrance edges (location entry → junction) ---
  // These are generated programmatically below for cleanliness; we list a
  // couple of special ones here that aren't 1:1 with a location entry.
  e("J-C11", "J-C10a", "INTERNAL", { lighting: "GOOD", surface: "TILES", notes: "Plaza → LHC link" }),

  // --- Diagonal stair shortcuts (shorter distance, slower + harder) ---
  // These make the multi-objective router produce genuinely different routes:
  //   SHORTEST takes the steps (fewest metres)
  //   FASTEST  avoids steps (steps slow your effective speed)
  //   EASIEST  avoids steps (high difficulty penalty)
  e("J-C6", "J-C13", "STEPS", { lighting: "PARTIAL", surface: "TILES", slope: 0.12, notes: "Stair shortcut: hostel → academic" }),
  e("J-C10", "J-C17", "STEPS", { lighting: "PARTIAL", surface: "TILES", slope: 0.1, notes: "Stair shortcut near LHC" }),
  e("J-C2", "J-C9", "STEPS", { lighting: "PARTIAL", surface: "TILES", slope: 0.12, notes: "Diagonal stair by dining" }),
  e("J-C10a", "J-C19", "STEPS", { lighting: "GOOD", surface: "TILES", slope: 0.1, notes: "LHC → AB3 stair link" }),
  e("J-C3", "J-C10", "PATH", { lighting: "PARTIAL", surface: "DIRT", traffic: "LOW", notes: "Garden shortcut (unpaved)" }),
];

// ---------------------------------------------------------------------------
// Entrance nodes: one per location, sitting at the building's main door.
// Generated so each Location's `entry` junction connects to a dedicated
// entrance node ENT-<slug>, and the entrance node sits at the building.
// ---------------------------------------------------------------------------

export function buildEntranceNodes(): GraphNode[] {
  return SEED_LOCATIONS.map((loc) => {
    const { lat, lng } = toLatLng(loc.east, loc.north);
    return {
      slug: `ENT-${loc.slug}`,
      lat,
      lng,
      kind: "ENTRANCE" as const,
      label: loc.name,
      locationSlug: loc.slug,
    };
  });
}

export function buildEntranceEdges(): SeedEdgeDef[] {
  return SEED_LOCATIONS.map((loc) =>
    e(
      loc.entry,
      `ENT-${loc.slug}`,
      "INTERNAL",
      { lighting: "GOOD" as Lighting, surface: "TILES" as Surface, traffic: "LOW" as TrafficLevel, notes: `Entrance to ${loc.name}` },
    ),
  );
}

// ---------------------------------------------------------------------------
// Resolve all seed data into concrete graph nodes + edges with metrics
// ---------------------------------------------------------------------------

/** Build the full node list: junctions + entrance nodes. */
export function buildAllNodes(): GraphNode[] {
  const junctionNodes: GraphNode[] = SEED_JUNCTIONS.map((j) => {
    const { lat, lng } = toLatLng(j.east, j.north);
    return {
      slug: j.slug,
      lat,
      lng,
      kind: j.kind,
      label: j.label,
    };
  });
  return [...junctionNodes, ...buildEntranceNodes()];
}

/** Build the full edge list with computed distance + baseline time. */
export function buildAllEdges(): GraphEdge[] {
  const nodeMap = new Map(buildAllNodes().map((n) => [n.slug, n]));
  const allDefs = [...SEED_EDGES, ...buildEntranceEdges()];

  return allDefs.map((def, i) => {
    const a = nodeMap.get(def.from);
    const b = nodeMap.get(def.to);
    if (!a || !b) {
      throw new Error(`Seed edge references unknown node: ${def.from} -> ${def.to}`);
    }
    const distanceM = haversine(a, b);
    // baseline time using NORMAL speed × road-type factor
    const baseSpeed = DEFAULT_SPEED_MPS.NORMAL;
    const factor =
      def.roadType === "STEPS"
        ? 0.7
        : def.roadType === "SERVICE"
          ? 0.9
          : def.roadType === "BRIDGE"
            ? 0.95
            : def.roadType === "PATH"
              ? 1.05
              : def.roadType === "INTERNAL"
                ? 1.0
                : 1.0;
    const estTimeSec = distanceM / (baseSpeed * factor);
    return {
      slug: `E-${def.from}-${def.to}-${i}`,
      from: def.from,
      to: def.to,
      distanceM,
      estTimeSec,
      roadType: def.roadType,
      walkable: def.walkable ?? true,
      lighting: def.lighting,
      surfaceType: def.surface,
      slope: def.slope,
      trafficLevel: def.traffic,
      notes: def.notes,
    } satisfies GraphEdge;
  });
}

// ---------------------------------------------------------------------------
// CAMPUS FEATURES — the "campus map" visual dataset (separate from routing).
// Building footprints as polygons (local metres → lat/lng) for the map layer.
// ---------------------------------------------------------------------------

export interface SeedBuilding {
  name: string;
  kind: "BUILDING" | "SPORTS" | "GREEN" | "WATER" | "COURT";
  // polygon ring in local metres [east, north]
  ring: [number, number][];
  color?: string;
}

function rect(
  cx: number,
  cy: number,
  w: number,
  h: number,
  rot = 0,
): [number, number][] {
  const hw = w / 2;
  const hh = h / 2;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const pts: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  return pts.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);
}

export const SEED_BUILDINGS: SeedBuilding[] = [
  // Hostels
  { name: "Hostel 1", kind: "BUILDING", ring: rect(-280, -310, 70, 50) },
  { name: "Hostel 2", kind: "BUILDING", ring: rect(-140, -310, 70, 50) },
  { name: "Hostel 3", kind: "BUILDING", ring: rect(0, -310, 70, 50) },
  { name: "Hostel 4", kind: "BUILDING", ring: rect(140, -310, 70, 50) },
  { name: "Hostel 5", kind: "BUILDING", ring: rect(-280, -210, 70, 50) },
  { name: "Hostel 6", kind: "BUILDING", ring: rect(-140, -210, 70, 50) },
  { name: "Hostel 7", kind: "BUILDING", ring: rect(140, -210, 70, 50) },

  // Dining & shopping
  { name: "Dining Hall", kind: "BUILDING", ring: rect(-70, -260, 80, 40) },
  { name: "Shopping Complex", kind: "BUILDING", ring: rect(-70, -160, 60, 30) },

  // Sports
  { name: "Sports Complex", kind: "BUILDING", ring: rect(-410, -40, 60, 50) },
  { name: "Football / Cricket Ground", kind: "SPORTS", ring: rect(-410, 90, 90, 140), color: "#b9d99a" },
  { name: "Tennis / Basketball Courts", kind: "COURT", ring: rect(-410, -160, 80, 60), color: "#c98b5a" },

  // Academic
  { name: "LHC", kind: "BUILDING", ring: rect(0, 10, 90, 60) },
  { name: "AB1", kind: "BUILDING", ring: rect(-220, 90, 70, 45) },
  { name: "AB2", kind: "BUILDING", ring: rect(-110, 90, 70, 45) },
  { name: "AB3", kind: "BUILDING", ring: rect(0, 90, 70, 45) },
  { name: "AB4", kind: "BUILDING", ring: rect(110, 90, 70, 45) },
  { name: "AB5", kind: "BUILDING", ring: rect(220, 90, 70, 45) },
  { name: "Library", kind: "BUILDING", ring: rect(0, 175, 80, 45) },
  { name: "Computer Centre", kind: "BUILDING", ring: rect(110, 175, 70, 45) },

  // Admin & health
  { name: "Administration", kind: "BUILDING", ring: rect(260, -40, 60, 50) },
  { name: "Health Centre", kind: "BUILDING", ring: rect(260, -160, 50, 40) },

  // Greens / landmarks
  { name: "Central Plaza", kind: "GREEN", ring: rect(0, -40, 90, 90), color: "#cdebc4" },
  { name: "Amphitheatre", kind: "GREEN", ring: rect(-70, 30, 60, 30), color: "#d8c99a" },
  { name: "Hostel Garden", kind: "GREEN", ring: rect(-70, -360, 120, 40), color: "#cdebc4" },
];

/** Convert a building ring (local metres) to a GeoJSON polygon [lng,lat][]. */
export function buildingToGeoJSON(b: SeedBuilding) {
  const ring = b.ring.map(([e, n]) => {
    const { lng, lat } = toLatLng(e, n);
    return [lng, lat] as [number, number];
  });
  // close the ring
  ring.push(ring[0]);
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [ring] },
    properties: {
      name: b.name,
      kind: b.kind,
      color: b.color ?? (b.kind === "BUILDING" ? "#d9d6cf" : "#cdebc4"),
    },
  };
}

/** Convert all edges to a GeoJSON LineString FeatureCollection (map rendering). */
export function edgesToGeoJSON(edges: GraphEdge[], nodes: GraphNode[]) {
  const nodeMap = new Map(nodes.map((n) => [n.slug, n]));
  return {
    type: "FeatureCollection" as const,
    features: edges
      .filter((e) => e.walkable)
      .map((e) => {
        const a = nodeMap.get(e.from);
        const b = nodeMap.get(e.to);
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
          },
        };
      })
      .filter(Boolean),
  };
}

/** Convert all nodes to a GeoJSON Point FeatureCollection. */
export function nodesToGeoJSON(nodes: GraphNode[]) {
  return {
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
}

export const SUPPORTED_MODES: WalkingMode[] = ["RELAXED", "NORMAL", "HURRY"];

/**
 * Returns the canonical list of campus locations. Used by URL deep-link
 * parsing/validation (see `src/lib/routing/share-url.ts`) and any other
 * module that needs to enumerate the seed POI set without importing the
 * raw array directly.
 */
export function getCampusLocations(): SeedLocation[] {
  return SEED_LOCATIONS;
}
