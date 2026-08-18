// Shared domain types for the IITGN Smart Walking Route platform.
// Kept free of any framework/DB concerns so the routing engine is pure TS.

export type WalkingMode = "RELAXED" | "NORMAL" | "HURRY";

export type RouteObjective = "FASTEST" | "SHORTEST" | "EASIEST";

export type EdgeRoadType =
  | "ROAD"
  | "PATH"
  | "SERVICE"
  | "INTERNAL"
  | "BRIDGE"
  | "STEPS";

export type Lighting = "GOOD" | "PARTIAL" | "NONE";
export type Surface = "CONCRETE" | "ASPHALT" | "TILES" | "DIRT" | "GRASS";
export type TrafficLevel = "LOW" | "MEDIUM" | "HIGH";

export interface LatLng {
  lat: number;
  lng: number;
}

/** A vertex in the walking network. */
export interface GraphNode {
  slug: string;
  lat: number;
  lng: number;
  kind: "INTERSECTION" | "ENTRANCE" | "GATE" | "DECISION" | "LANDMARK" | "BEND";
  label?: string;
  locationSlug?: string;
}

/** A directed-but-treated-bidirectional walkable edge. */
export interface GraphEdge {
  slug: string;
  from: string; // node slug
  to: string; // node slug
  distanceM: number;
  estTimeSec: number; // baseline seconds (NORMAL mode)
  roadType: EdgeRoadType;
  walkable: boolean;
  lighting?: Lighting;
  surfaceType?: Surface;
  slope?: number; // -1..1
  trafficLevel?: TrafficLevel;
  notes?: string;
}

/** The full campus walking network. */
export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  /** adjacency: node slug -> list of (edge, neighbor slug) */
  adj: Map<string, Array<{ edge: GraphEdge; to: string }>>;
}

export interface RouteResult {
  objective: RouteObjective;
  fromLocation?: string;
  toLocation?: string;
  mode: WalkingMode;
  /** ordered path as [lng, lat] for GeoJSON LineString */
  path: [number, number][];
  nodeSlugs: string[];
  distanceM: number;
  durationS: number;
  eta: string; // ISO time string
  difficulty: number; // 0..100, lower = easier
  reason: string;
  /** walking speed used to compute duration (m/s) */
  speedMps: number;
  /** turn-by-turn walking instructions (added by the API layer) */
  steps?: DirectionStep[];
}

export type Maneuver =
  | "DEPART"
  | "CONTINUE"
  | "TURN_LEFT"
  | "TURN_RIGHT"
  | "SHARP_LEFT"
  | "SHARP_RIGHT"
  | "SLIGHT_LEFT"
  | "SLIGHT_RIGHT"
  | "STAIRS"
  | "ARRIVE";

export type Cardinal = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface DirectionStep {
  index: number;
  instruction: string;
  maneuver: Maneuver;
  distanceM: number;
  cumulativeM: number;
  direction: Cardinal;
  endNodeSlug: string;
  endLabel?: string;
}

export interface MultiRouteResult {
  fastest?: RouteResult;
  shortest?: RouteResult;
  easiest?: RouteResult;
  /** a meaningfully different alternative if one exists */
  alternative?: RouteResult;
  speedMps: number;
}

export interface JourneyRecord {
  journeyId: string;
  userId?: string;
  fromLocation?: string;
  toLocation?: string;
  mode: WalkingMode;
  routeId?: string;
  predictedS?: number;
  actualS?: number;
  actualM?: number;
  startTs: string;
  endTs?: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABUSED" | "ABANDONED";
}

export interface GpsSample {
  lat: number;
  lng: number;
  accuracyM?: number;
  capturedTs: string; // ISO
  matched?: boolean;
  matchedNode?: string;
}

export interface WalkingProfileStats {
  mode: WalkingMode;
  scope: "CAMPUS" | "USER";
  speedMps: number;
  samples: number;
  sumDistM: number;
  sumTimeS: number;
}

/** Default walking speeds (m/s). Tunable; overridden by learned campus stats. */
export const DEFAULT_SPEED_MPS: Record<WalkingMode, number> = {
  RELAXED: 0.9, // ~3.24 km/h
  NORMAL: 1.25, // ~4.5 km/h
  HURRY: 1.6, // ~5.76 km/h
};

export const MODE_LABELS: Record<WalkingMode, string> = {
  RELAXED: "Relaxed",
  NORMAL: "Normal",
  HURRY: "Hurry",
};

export const CATEGORY_LABELS: Record<string, string> = {
  HOSTEL: "Hostel",
  ACADEMIC: "Academic Block",
  CLASSROOM: "Classroom",
  LAB: "Laboratory",
  LIBRARY: "Library",
  SPORTS: "Sports",
  DINING: "Dining",
  ADMIN: "Administration",
  GATE: "Gate",
  LANDMARK: "Landmark",
  OTHER: "Other",
};

export const ROAD_TYPE_SPEED_FACTOR: Record<EdgeRoadType, number> = {
  // multiplier applied to base walking speed per road surface type
  ROAD: 1.0,
  PATH: 1.05, // dedicated paths slightly faster
  INTERNAL: 1.02,
  SERVICE: 0.9,
  BRIDGE: 0.95,
  STEPS: 0.7, // stairs slow you down
};
