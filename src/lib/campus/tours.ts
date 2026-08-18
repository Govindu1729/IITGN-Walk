// Curated thematic walking tours of the IITGN campus.
//
// Each tour is a sequence of campus location slugs (from SEED_LOCATIONS) with
// descriptive metadata. The Tours panel turns the first/last waypoint into a
// from→to route request; the user follows the recommended path, and each
// intermediate waypoint is highlighted as the journey progresses.
//
// To add a tour: append a new entry to CAMPUS_TOURS below.

export type TourIcon =
  | "landmark"
  | "academic"
  | "sports"
  | "nature"
  | "dining";

export interface CampusTour {
  id: string;
  name: string;
  /** Short tagline shown on the tour card. */
  description: string;
  /** Approximate walk duration in minutes. */
  durationMin: number;
  /** Approximate total distance in metres. */
  distanceM: number;
  /** Ordered location slugs — the path the tour follows. */
  waypoints: string[];
  /** Tailwind colour name used for theming the card (e.g. "amber"). */
  themeColor:
    | "amber"
    | "teal"
    | "violet"
    | "emerald"
    | "rose"
    | "sky"
    | "orange";
  /** Lucide icon key — mapped to a component in the panel. */
  icon: TourIcon;
  /** Long-form summary shown when the tour is expanded. */
  summary: string;
  /** Difficulty rating 1-5 (1=easy flat, 5=strenuous hills/stairs). */
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export const CAMPUS_TOURS: CampusTour[] = [
  {
    id: "heritage-walk",
    name: "Heritage Walk",
    description: "Trace the campus origins — library to main gate.",
    durationMin: 25,
    distanceM: 850,
    waypoints: ["library", "amphitheatre", "central-plaza", "main-gate"],
    themeColor: "amber",
    icon: "landmark",
    summary:
      "A leisurely stroll through the heart of IITGN's heritage core — from the Library, past the Amphitheatre and Central Plaza, all the way to the Main Gate. Best enjoyed in the early evening when the light is soft.",
    difficulty: 1,
  },
  {
    id: "academic-trail",
    name: "Academic Trail",
    description: "Walk through every academic block — AB1 to LHC.",
    durationMin: 18,
    distanceM: 620,
    waypoints: ["hostel-3", "ab1", "ab2", "ab3", "lhc"],
    themeColor: "teal",
    icon: "academic",
    summary:
      "A guided walk of the academic spine. Start at Hostel 3, head north past AB1, AB2 and AB3 (the labs block), and finish at the Lecture Hall Complex. Ideal for new students orienting themselves before classes start.",
    difficulty: 2,
  },
  {
    id: "sports-circuit",
    name: "Sports Circuit",
    description: "Warm-up loop covering the sports cluster.",
    durationMin: 15,
    distanceM: 540,
    waypoints: ["hostel-1", "sports-complex", "tennis-courts", "football-ground"],
    themeColor: "orange",
    icon: "sports",
    summary:
      "A fitness-focused circuit starting at Hostel 1, swinging by the Sports Complex gym, the Tennis & Basketball courts and finishing at the Football / Cricket Ground. Stretch before you start — the west perimeter has uneven footpath in places.",
    difficulty: 3,
  },
  {
    id: "green-campus-tour",
    name: "Green Campus Tour",
    description: "Discover the campus greenery and open lawns.",
    durationMin: 20,
    distanceM: 720,
    waypoints: ["central-plaza", "amphitheatre", "library", "north-gate"],
    themeColor: "emerald",
    icon: "nature",
    summary:
      "IITGN is recognised for its green cover. This tour starts at the Central Plaza quad, loops through the Amphitheatre garden, past the Library lawn, and ends at the tree-lined avenue near the North Gate. Best in the early morning for birdwatching.",
    difficulty: 2,
  },
  {
    id: "dining-crawl",
    name: "Dining Crawl",
    description: "Hit every eatery and snack point on campus.",
    durationMin: 30,
    distanceM: 900,
    waypoints: ["hostel-5", "dining-hall", "shopping-complex", "central-plaza", "amphitheatre"],
    themeColor: "rose",
    icon: "dining",
    summary:
      "A foodie's tour of IITGN: start at Hostel 5, walk to the central Dining Hall (mess), continue to the Shopping Complex (Amul & snacks), then the Central Plaza coffee cart, and finish at the Amphitheatre canteen. Pace yourself.",
    difficulty: 2,
  },
];
