// Indoor floor plans for major IITGN campus buildings.
//
// Each plan is rendered by `IndoorPlanView` as a 0–100 × 0–100 SVG canvas
// (percent units). Coordinates use the convention:
//   x = left edge (%), y = top edge (%)
//   w = width  (%), h = height (%)
//
// Plans are STATIC and shipped in the JS bundle — no API endpoint needed.
// Downstream consumers (api-client.ts) re-export the types for type-safety.

/** Discriminated union of all indoor feature types. */
export type IndoorFeatureType =
  | "room"
  | "restroom-m"
  | "restroom-f"
  | "exit"
  | "stairs"
  | "elevator"
  | "corridor"
  | "classroom"
  | "lab"
  | "office"
  | "cafe"
  | "study-area";

/** A single rectangular feature on the floor plan. */
export interface IndoorFeature {
  /** Stable id (unique within a plan). */
  id: string;
  /** Display label rendered inside the rect (short — 1–3 words). */
  label: string;
  /** Semantic type — drives fill colour + legend. */
  type: IndoorFeatureType;
  /** Left edge, percentage 0–100. */
  x: number;
  /** Top edge, percentage 0–100. */
  y: number;
  /** Width, percentage 0–100. */
  w: number;
  /** Height, percentage 0–100. */
  h: number;
  /** Optional seated / occupancy capacity (for classrooms, halls, labs). */
  capacity?: number;
  /** Optional free-form notes shown in hover tooltip / click popup. */
  notes?: string;
}

/** Legend entry mapping a feature type to a human label + colour. */
export interface IndoorLegendEntry {
  type: IndoorFeatureType;
  label: string;
  color: string;
}

/** A complete floor plan for one building + floor. */
export interface IndoorPlan {
  /** Slug of the building (must match a CampusLocation slug from seed.ts). */
  buildingSlug: string;
  /** Human-friendly building name (rendered as Dialog title). */
  buildingName: string;
  /** Floor number (0 = ground). */
  floorNumber: number;
  /** Floor display name, e.g. "Ground Floor", "First Floor". */
  floorName: string;
  /** SVG canvas width in viewBox units (always 100 — kept for future flexibility). */
  width: number;
  /** SVG canvas height in viewBox units (always 100). */
  height: number;
  /** All rectangular features on this floor. */
  features: IndoorFeature[];
  /** Optional legend overrides (defaults derived from FEATURE_COLORS if absent). */
  legend?: IndoorLegendEntry[];
}

/** Default colour palette per feature type.
 *  Honours the project rule: NO indigo, NO blue for primary accents.
 *  Uses teal, emerald, amber, violet, rose, orange, slate. */
export const FEATURE_COLORS: Record<IndoorFeatureType, string> = {
  room: "#e2e8f0", // slate-200 (light grey)
  "restroom-m": "#0d9488", // teal-600 (M)
  "restroom-f": "#e11d48", // rose-600 (F)
  exit: "#10b981", // emerald-500
  stairs: "#f59e0b", // amber-500
  elevator: "#7c3aed", // violet-600
  corridor: "#f1f5f9", // slate-100
  classroom: "#ccfbf1", // teal-100
  lab: "#99f6e4", // teal-200
  office: "#f1f5f9", // slate-100
  cafe: "#fef3c7", // amber-100
  "study-area": "#d1fae5", // emerald-100
};

/** Default legend entries (used when a plan omits `legend`). */
export const DEFAULT_LEGEND: IndoorLegendEntry[] = [
  { type: "classroom", label: "Classroom", color: FEATURE_COLORS.classroom },
  { type: "lab", label: "Computer Lab", color: FEATURE_COLORS.lab },
  { type: "office", label: "Office", color: FEATURE_COLORS.office },
  { type: "study-area", label: "Study Area", color: FEATURE_COLORS["study-area"] },
  { type: "cafe", label: "Café", color: FEATURE_COLORS.cafe },
  { type: "restroom-m", label: "Restroom (M)", color: FEATURE_COLORS["restroom-m"] },
  { type: "restroom-f", label: "Restroom (F)", color: FEATURE_COLORS["restroom-f"] },
  { type: "stairs", label: "Stairs", color: FEATURE_COLORS.stairs },
  { type: "elevator", label: "Elevator", color: FEATURE_COLORS.elevator },
  { type: "exit", label: "Exit", color: FEATURE_COLORS.exit },
  { type: "corridor", label: "Corridor / Lobby", color: FEATURE_COLORS.corridor },
  { type: "room", label: "Room", color: FEATURE_COLORS.room },
];

/** Map of building slug → IndoorPlan for all buildings with floor plans. */
export const INDOOR_BUILDINGS: Record<string, IndoorPlan> = {
  // ── Library & Learning Resource Centre — Ground Floor ──
  library: {
    buildingSlug: "library",
    buildingName: "Library & Learning Resource Centre",
    floorNumber: 0,
    floorName: "Ground Floor",
    width: 100,
    height: 100,
    features: [
      // Main entrance (south-center)
      {
        id: "lib-entrance",
        label: "Entrance",
        type: "exit",
        x: 42, y: 92, w: 16, h: 6,
        notes: "Main entrance with RFID turnstiles. Accessible ramp to the left.",
      },
      // Lobby
      {
        id: "lib-lobby",
        label: "Lobby",
        type: "corridor",
        x: 35, y: 78, w: 30, h: 14,
        notes: "Spacious lobby with seating bench and bulletin board.",
      },
      // Circulation desk
      {
        id: "lib-circulation",
        label: "Circulation Desk",
        type: "room",
        x: 38, y: 70, w: 24, h: 8,
        notes: "Issue / return books here. Staffed 9 AM – 8 PM.",
      },
      // Reading Hall (study area, capacity 80)
      {
        id: "lib-reading-hall",
        label: "Reading Hall",
        type: "study-area",
        x: 4, y: 45, w: 44, h: 25,
        capacity: 80,
        notes: "Quiet zone. Open 24/7 during exam season. Individual carrels with reading lamps.",
      },
      // Reference section
      {
        id: "lib-reference",
        label: "Reference Section",
        type: "room",
        x: 52, y: 45, w: 44, h: 25,
        capacity: 40,
        notes: "Reference books and encyclopedias. In-library use only.",
      },
      // Computer lab
      {
        id: "lib-comp-lab",
        label: "Computer Lab",
        type: "lab",
        x: 4, y: 18, w: 44, h: 25,
        capacity: 30,
        notes: "30 workstations with internet + printing. Scanning available at the corner kiosk.",
      },
      // Café corner
      {
        id: "lib-cafe",
        label: "Café Corner",
        type: "cafe",
        x: 52, y: 18, w: 44, h: 25,
        capacity: 25,
        notes: "Amul parlour + coffee vending. Hot snacks 11 AM – 6 PM.",
      },
      // Restrooms
      {
        id: "lib-restroom-m",
        label: "Restroom (M)",
        type: "restroom-m",
        x: 4, y: 78, w: 12, h: 12,
        notes: "Men's restroom.",
      },
      {
        id: "lib-restroom-f",
        label: "Restroom (F)",
        type: "restroom-f",
        x: 84, y: 78, w: 12, h: 12,
        notes: "Women's restroom.",
      },
      // Stairs
      {
        id: "lib-stairs",
        label: "Stairs",
        type: "stairs",
        x: 4, y: 4, w: 12, h: 12,
        notes: "Connects all 3 floors. Fire-rated enclosure.",
      },
      // Elevator
      {
        id: "lib-elevator",
        label: "Elevator",
        type: "elevator",
        x: 84, y: 4, w: 12, h: 12,
        notes: "Wheelchair-accessible elevator. Stops at all 3 floors.",
      },
      // Emergency exits (×2)
      {
        id: "lib-exit-1",
        label: "Emergency Exit",
        type: "exit",
        x: 4, y: 38, w: 10, h: 6,
        notes: "Push-bar exit to the west lawn. Sounds alarm when opened.",
      },
      {
        id: "lib-exit-2",
        label: "Emergency Exit",
        type: "exit",
        x: 86, y: 38, w: 10, h: 6,
        notes: "Push-bar exit to the east lawn. Sounds alarm when opened.",
      },
    ],
    legend: [
      { type: "study-area", label: "Reading Hall", color: FEATURE_COLORS["study-area"] },
      { type: "lab", label: "Computer Lab", color: FEATURE_COLORS.lab },
      { type: "cafe", label: "Café Corner", color: FEATURE_COLORS.cafe },
      { type: "room", label: "Reference / Desk", color: FEATURE_COLORS.room },
      { type: "restroom-m", label: "Restroom (M)", color: FEATURE_COLORS["restroom-m"] },
      { type: "restroom-f", label: "Restroom (F)", color: FEATURE_COLORS["restroom-f"] },
      { type: "stairs", label: "Stairs", color: FEATURE_COLORS.stairs },
      { type: "elevator", label: "Elevator", color: FEATURE_COLORS.elevator },
      { type: "exit", label: "Exit", color: FEATURE_COLORS.exit },
      { type: "corridor", label: "Lobby", color: FEATURE_COLORS.corridor },
    ],
  },

  // ── Academic Block 1 (AB1) — First Floor ──
  ab1: {
    buildingSlug: "ab1",
    buildingName: "Academic Block 1 (AB1)",
    floorNumber: 1,
    floorName: "First Floor",
    width: 100,
    height: 100,
    features: [
      // Entrance (south-center)
      {
        id: "ab1-entrance",
        label: "Entrance",
        type: "exit",
        x: 44, y: 93, w: 12, h: 5,
        notes: "Main AB1 entrance. Glass doors, accessible via ramp.",
      },
      // Lobby
      {
        id: "ab1-lobby",
        label: "Lobby",
        type: "corridor",
        x: 30, y: 80, w: 40, h: 13,
        notes: "Lobby with notice boards and seating.",
      },
      // 6 Classrooms (capacity 40-60 each)
      {
        id: "ab1-cr1",
        label: "CR-101",
        type: "classroom",
        x: 4, y: 50, w: 28, h: 22,
        capacity: 60,
        notes: "Standard classroom with projector + whiteboard. Capacity 60.",
      },
      {
        id: "ab1-cr2",
        label: "CR-102",
        type: "classroom",
        x: 36, y: 50, w: 28, h: 22,
        capacity: 50,
        notes: "Classroom with U-shaped seating. Capacity 50.",
      },
      {
        id: "ab1-cr3",
        label: "CR-103",
        type: "classroom",
        x: 68, y: 50, w: 28, h: 22,
        capacity: 40,
        notes: "Smaller classroom for tutorials. Capacity 40.",
      },
      {
        id: "ab1-cr4",
        label: "CR-104",
        type: "classroom",
        x: 4, y: 22, w: 28, h: 22,
        capacity: 60,
        notes: "Classroom with smart board. Capacity 60.",
      },
      {
        id: "ab1-cr5",
        label: "CR-105",
        type: "classroom",
        x: 36, y: 22, w: 28, h: 22,
        capacity: 50,
        notes: "Classroom with audio system. Capacity 50.",
      },
      {
        id: "ab1-cr6",
        label: "CR-106",
        type: "classroom",
        x: 68, y: 22, w: 28, h: 22,
        capacity: 40,
        notes: "Tutorial room. Capacity 40.",
      },
      // Faculty offices (×3)
      {
        id: "ab1-office-1",
        label: "Faculty Office A",
        type: "office",
        x: 4, y: 80, w: 22, h: 11,
        notes: "CSE faculty cabin.",
      },
      {
        id: "ab1-office-2",
        label: "Faculty Office B",
        type: "office",
        x: 74, y: 80, w: 22, h: 11,
        notes: "Mathematics faculty cabin.",
      },
      {
        id: "ab1-office-3",
        label: "Faculty Office C",
        type: "office",
        x: 4, y: 4, w: 22, h: 12,
        notes: "Visiting faculty office.",
      },
      // Department office
      {
        id: "ab1-dept-office",
        label: "Dept. Office",
        type: "office",
        x: 74, y: 4, w: 22, h: 12,
        notes: "CSE Department administrative office. Open Mon–Fri 9 AM – 5:30 PM.",
      },
      // Restrooms
      {
        id: "ab1-restroom-m",
        label: "Restroom (M)",
        type: "restroom-m",
        x: 30, y: 4, w: 18, h: 12,
        notes: "Men's restroom.",
      },
      {
        id: "ab1-restroom-f",
        label: "Restroom (F)",
        type: "restroom-f",
        x: 52, y: 4, w: 18, h: 12,
        notes: "Women's restroom.",
      },
      // Stairs + Elevator (central core)
      {
        id: "ab1-stairs",
        label: "Stairs",
        type: "stairs",
        x: 30, y: 76, w: 12, h: 4,
        notes: "Connects all 4 floors.",
      },
      {
        id: "ab1-elevator",
        label: "Elevator",
        type: "elevator",
        x: 58, y: 76, w: 12, h: 4,
        notes: "Wheelchair-accessible.",
      },
      // Exits (×2)
      {
        id: "ab1-exit-1",
        label: "Emergency Exit",
        type: "exit",
        x: 30, y: 46, w: 8, h: 4,
        notes: "West emergency exit.",
      },
      {
        id: "ab1-exit-2",
        label: "Emergency Exit",
        type: "exit",
        x: 62, y: 46, w: 8, h: 4,
        notes: "East emergency exit.",
      },
    ],
    legend: [
      { type: "classroom", label: "Classroom", color: FEATURE_COLORS.classroom },
      { type: "office", label: "Office", color: FEATURE_COLORS.office },
      { type: "restroom-m", label: "Restroom (M)", color: FEATURE_COLORS["restroom-m"] },
      { type: "restroom-f", label: "Restroom (F)", color: FEATURE_COLORS["restroom-f"] },
      { type: "stairs", label: "Stairs", color: FEATURE_COLORS.stairs },
      { type: "elevator", label: "Elevator", color: FEATURE_COLORS.elevator },
      { type: "exit", label: "Exit", color: FEATURE_COLORS.exit },
      { type: "corridor", label: "Lobby", color: FEATURE_COLORS.corridor },
    ],
  },

  // ── Lecture Hall Complex (LHC) — Ground Floor ──
  lhc: {
    buildingSlug: "lhc",
    buildingName: "Lecture Hall Complex (LHC)",
    floorNumber: 0,
    floorName: "Ground Floor",
    width: 100,
    height: 100,
    features: [
      // Entrance (south-center)
      {
        id: "lhc-entrance",
        label: "Entrance",
        type: "exit",
        x: 44, y: 94, w: 12, h: 4,
        notes: "Main LHC entrance. Wide double doors + ramp.",
      },
      // Lobby
      {
        id: "lhc-lobby",
        label: "Lobby",
        type: "corridor",
        x: 30, y: 82, w: 40, h: 12,
        notes: "Central lobby connecting all lecture halls.",
      },
      // Restrooms (×2)
      {
        id: "lhc-restroom-m",
        label: "Restroom (M)",
        type: "restroom-m",
        x: 4, y: 82, w: 22, h: 12,
        notes: "Men's restroom.",
      },
      {
        id: "lhc-restroom-f",
        label: "Restroom (F)",
        type: "restroom-f",
        x: 74, y: 82, w: 22, h: 12,
        notes: "Women's restroom.",
      },
      // Waiting area (between lobby + lecture halls)
      {
        id: "lhc-waiting",
        label: "Waiting Area",
        type: "study-area",
        x: 20, y: 72, w: 24, h: 8,
        capacity: 30,
        notes: "Seating for students between lectures.",
      },
      // Seminar room
      {
        id: "lhc-seminar",
        label: "Seminar Room",
        type: "room",
        x: 56, y: 72, w: 24, h: 8,
        capacity: 60,
        notes: "Booking-only seminar room with conference table + projector.",
      },
      // Stairs (×2 — west + east wings)
      {
        id: "lhc-stairs-1",
        label: "Stairs",
        type: "stairs",
        x: 4, y: 72, w: 12, h: 8,
        notes: "West staircase. Connects 3 floors.",
      },
      {
        id: "lhc-stairs-2",
        label: "Stairs",
        type: "stairs",
        x: 84, y: 72, w: 12, h: 8,
        notes: "East staircase. Connects 3 floors.",
      },
      // Elevator (center)
      {
        id: "lhc-elevator",
        label: "Elevator",
        type: "elevator",
        x: 44, y: 72, w: 12, h: 8,
        notes: "Central elevator. Wheelchair accessible.",
      },
      // 4 Lecture Halls (capacity 120-200)
      {
        id: "lhc-lh1",
        label: "LH-1",
        type: "classroom",
        x: 4, y: 36, w: 44, h: 30,
        capacity: 200,
        notes: "Largest lecture hall. Tiered seating + dual projectors.",
      },
      {
        id: "lhc-lh2",
        label: "LH-2",
        type: "classroom",
        x: 52, y: 36, w: 44, h: 30,
        capacity: 180,
        notes: "Tiered seating + smart board.",
      },
      {
        id: "lhc-lh3",
        label: "LH-3",
        type: "classroom",
        x: 4, y: 4, w: 44, h: 28,
        capacity: 150,
        notes: "Mid-size lecture hall. Audio system + projector.",
      },
      {
        id: "lhc-lh4",
        label: "LH-4",
        type: "classroom",
        x: 52, y: 4, w: 44, h: 28,
        capacity: 120,
        notes: "Smallest lecture hall. Used for tutorials.",
      },
      // Exits (×3 — west + east + north fire escape)
      {
        id: "lhc-exit-1",
        label: "Emergency Exit",
        type: "exit",
        x: 4, y: 34, w: 8, h: 4,
        notes: "West emergency exit.",
      },
      {
        id: "lhc-exit-2",
        label: "Emergency Exit",
        type: "exit",
        x: 88, y: 34, w: 8, h: 4,
        notes: "East emergency exit.",
      },
      {
        id: "lhc-exit-3",
        label: "Fire Exit",
        type: "exit",
        x: 46, y: 0, w: 8, h: 4,
        notes: "North fire exit to back corridor.",
      },
    ],
    legend: [
      { type: "classroom", label: "Lecture Hall", color: FEATURE_COLORS.classroom },
      { type: "study-area", label: "Waiting Area", color: FEATURE_COLORS["study-area"] },
      { type: "room", label: "Seminar Room", color: FEATURE_COLORS.room },
      { type: "restroom-m", label: "Restroom (M)", color: FEATURE_COLORS["restroom-m"] },
      { type: "restroom-f", label: "Restroom (F)", color: FEATURE_COLORS["restroom-f"] },
      { type: "stairs", label: "Stairs", color: FEATURE_COLORS.stairs },
      { type: "elevator", label: "Elevator", color: FEATURE_COLORS.elevator },
      { type: "exit", label: "Exit", color: FEATURE_COLORS.exit },
      { type: "corridor", label: "Lobby", color: FEATURE_COLORS.corridor },
    ],
  },
};

/** Get the indoor plan for a building slug, or null if none exists. */
export function getIndoorPlan(buildingSlug: string): IndoorPlan | null {
  return INDOOR_BUILDINGS[buildingSlug] ?? null;
}

/** Check whether a building has an indoor plan. */
export function hasIndoorPlan(buildingSlug: string): boolean {
  return Boolean(INDOOR_BUILDINGS[buildingSlug]);
}

/** List of all building slugs that have indoor plans. */
export function getIndoorBuildings(): string[] {
  return Object.keys(INDOOR_BUILDINGS);
}
