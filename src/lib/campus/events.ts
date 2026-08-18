// Campus Events Calendar data for IIT Gandhinagar.
//
// Each event points to a campus location by `venueSlug` (the same slug space
// used by SEED_LOCATIONS / POI_DETAILS — e.g. "amphitheatre", "ab1", "library",
// "sports-complex", "central-plaza"). The Events panel renders a "Navigate to
// event" button that pushes the venue slug into the route planner as the
// destination and switches to the Navigate tab.
//
// To add an event: append a new entry to SAMPLE_EVENTS below. The helpers
// (getUpcomingEvents / getTodayEvents / getEventsByCategory / etc.) all derive
// their results from this list, so no extra wiring is needed.
//
// All sample dates are anchored in August 2026 (today ≈ 2026-08-18) — some
// events are in the past, one or two are today, and several are upcoming so
// the UI shows every status pill ("Today" / "Ongoing" / "Upcoming" / "Past").

export type EventCategory =
  | "CULTURAL"
  | "TECHNICAL"
  | "SPORTS"
  | "ACADEMIC"
  | "SOCIAL"
  | "WORKSHOP";

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  /** ISO timestamp (UTC). */
  startTime: string;
  /** ISO timestamp (UTC). */
  endTime: string;
  /** Campus location slug (matches SEED_LOCATIONS / POI_DETAILS keys). */
  venueSlug: string;
  organizer: string;
  tags: string[];
  /** Optional venue capacity (drives a "X / Y registered" progress bar). */
  capacity?: number;
  /** Optional current registration count. */
  registeredCount?: number;
  /** Featured events get a star icon + subtle gradient background. */
  isFeatured: boolean;
}

/* ── Category metadata (Tailwind class strings, no indigo/blue) ────────── */

export interface EventCategoryMeta {
  /** Lucide icon name (mapped to a component in the panel). */
  icon:
    | "Sparkles"
    | "Cpu"
    | "Trophy"
    | "GraduationCap"
    | "Users"
    | "Wrench";
  /** Short human label. */
  label: string;
  /** Tailwind classes for the category badge (text + bg). */
  badge: string;
  /** Tailwind classes for the icon tile (bg + text). */
  iconTile: string;
  /** Tailwind gradient classes for featured-card backgrounds. */
  gradient: string;
  /** Tailwind text colour for accent text. */
  accentText: string;
  /** Hex accent for inline styles (glow, etc.). */
  accentHex: string;
}

export const EVENT_CATEGORY_META: Record<EventCategory, EventCategoryMeta> = {
  CULTURAL: {
    icon: "Sparkles",
    label: "Cultural",
    badge:
      "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    iconTile:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    gradient:
      "from-violet-50/70 to-rose-50/30 dark:from-violet-950/30 dark:to-rose-950/20",
    accentText: "text-violet-700 dark:text-violet-300",
    accentHex: "#7c3aed",
  },
  TECHNICAL: {
    icon: "Cpu",
    label: "Technical",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
    iconTile:
      "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
    gradient:
      "from-teal-50/70 to-cyan-50/30 dark:from-teal-950/30 dark:to-cyan-950/20",
    accentText: "text-teal-700 dark:text-teal-300",
    accentHex: "#0d9488",
  },
  SPORTS: {
    icon: "Trophy",
    label: "Sports",
    badge:
      "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    iconTile:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
    gradient:
      "from-orange-50/70 to-amber-50/30 dark:from-orange-950/30 dark:to-amber-950/20",
    accentText: "text-orange-700 dark:text-orange-300",
    accentHex: "#ea580c",
  },
  ACADEMIC: {
    icon: "GraduationCap",
    label: "Academic",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    iconTile:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    gradient:
      "from-emerald-50/70 to-green-50/30 dark:from-emerald-950/30 dark:to-green-950/20",
    accentText: "text-emerald-700 dark:text-emerald-300",
    accentHex: "#059669",
  },
  SOCIAL: {
    icon: "Users",
    label: "Social",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    iconTile: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    gradient:
      "from-rose-50/70 to-pink-50/30 dark:from-rose-950/30 dark:to-pink-950/20",
    accentText: "text-rose-700 dark:text-rose-300",
    accentHex: "#e11d48",
  },
  WORKSHOP: {
    icon: "Wrench",
    label: "Workshop",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    iconTile:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    gradient:
      "from-amber-50/70 to-yellow-50/30 dark:from-amber-950/30 dark:to-yellow-950/20",
    accentText: "text-amber-700 dark:text-amber-300",
    accentHex: "#d97706",
  },
};

/* ── Sample events (August 2026, IITGN context) ───────────────────────── */
//
// Anchor "now" to August 18, 2026 for sampling determinism. The helpers
// (isEventToday / isEventOngoing / etc.) use the real wall-clock time, so a
// live viewer sees the correct status pills regardless of when they load.

/** Helper to build an ISO timestamp from a YYYY-MM-DDTHH:MM:SS string. */
function ts(dateStr: string): string {
  // Treat the input as Asia/Kolkata (IST, UTC+5:30) campus local time, then
  // convert to UTC ISO so consumers don't depend on the server's TZ.
  // Input format: "2026-08-18T10:00:00"
  const local = new Date(dateStr + "+05:30");
  return local.toISOString();
}

export const SAMPLE_EVENTS: CampusEvent[] = [
  // ── Past events (before Aug 18) ────────────────────────────────────────
  {
    id: "evt-photography-walk",
    title: "Photography Walk: Monsoon Greens",
    description:
      "A guided early-morning photo walk through the campus green cover. Bring your DSLR or smartphone — the Photography Club will share composition tips. Meet at Central Plaza at 6:45 AM. Best spots: Library lawn, North Gate avenue, Amphitheatre garden.",
    category: "SOCIAL",
    startTime: ts("2026-08-14T06:45:00"),
    endTime: ts("2026-08-14T08:30:00"),
    venueSlug: "central-plaza",
    organizer: "Photography Club, IITGN",
    tags: ["Photography", "Beginner Friendly", "Outdoor"],
    capacity: 30,
    registeredCount: 28,
    isFeatured: false,
  },
  {
    id: "evt-independence-day",
    title: "Independence Day Flag Hoisting",
    description:
      "78th Independence Day celebration. Flag hoisting by the Director at the Central Plaza, followed by the student choir and a short cultural programme. All students, faculty and staff are requested to assemble by 8:15 AM.",
    category: "SOCIAL",
    startTime: ts("2026-08-15T08:15:00"),
    endTime: ts("2026-08-15T09:30:00"),
    venueSlug: "central-plaza",
    organizer: "Student Affairs Office",
    tags: ["National Holiday", "Flag Hoisting", "Mandatory"],
    capacity: 1000,
    registeredCount: 742,
    isFeatured: false,
  },
  {
    id: "evt-quantum-talk",
    title: "Tech Talk: Quantum Computing 101",
    description:
      "Prof. Aditya Iyer (CSE) demystifies quantum computing — qubits, superposition, entanglement, and what the NISQ era means for India. Live demo on IBM Quantum Experience. Open to all years; no physics prerequisite.",
    category: "TECHNICAL",
    startTime: ts("2026-08-17T17:00:00"),
    endTime: ts("2026-08-17T18:30:00"),
    venueSlug: "lhc",
    organizer: "ACM Student Chapter, IITGN",
    tags: ["Tech Talk", "Quantum", "Demo"],
    capacity: 200,
    registeredCount: 156,
    isFeatured: false,
  },

  // ── Today (Aug 18, 2026) ───────────────────────────────────────────────
  {
    id: "evt-yoga-day",
    title: "Yoga Day Celebration",
    description:
      "Early-morning yoga session to mark the campus wellness week. Open to all skill levels — mats provided. Conducted by the Sports Office with guidance from a certified instructor. Herbal tea served after the session.",
    category: "SOCIAL",
    startTime: ts("2026-08-18T06:30:00"),
    endTime: ts("2026-08-18T07:45:00"),
    venueSlug: "amphitheatre",
    organizer: "Sports Office & Wellness Club",
    tags: ["Wellness", "Yoga", "Beginner Friendly", "Free"],
    capacity: 80,
    registeredCount: 64,
    isFeatured: false,
  },
  {
    id: "evt-ml-workshop-today",
    title: "Hands-on ML Workshop: From Data to Model",
    description:
      "A 3-hour hands-on workshop by Prof. Meena Shah covering the end-to-end ML pipeline using scikit-learn. Bring your laptop with Python 3.10+ installed. Starter notebooks will be shared at the venue. Limited to 40 seats.",
    category: "WORKSHOP",
    startTime: ts("2026-08-18T14:00:00"),
    endTime: ts("2026-08-18T17:00:00"),
    venueSlug: "ab3",
    organizer: "CSE Department, IITGN",
    tags: ["Machine Learning", "Hands-on", "Laptop Required"],
    capacity: 40,
    registeredCount: 40,
    isFeatured: true,
  },
  {
    id: "evt-movie-night",
    title: "Movie Screening: Interstellar (Open Air)",
    description:
      "Cinephilia IITGN presents Christopher Nolan's Interstellar under the stars. Popcorn and chai on sale at the Amphitheatre canteen. Carry a light jacket — evenings are getting cooler. Free entry for all IITGN students.",
    category: "CULTURAL",
    startTime: ts("2026-08-18T20:00:00"),
    endTime: ts("2026-08-18T23:30:00"),
    venueSlug: "amphitheatre",
    organizer: "Cinephilia IITGN",
    tags: ["Open Air", "Free Entry", "Popcorn"],
    capacity: 300,
    registeredCount: 187,
    isFeatured: false,
  },

  // ── Upcoming (after Aug 18) ────────────────────────────────────────────
  {
    id: "evt-ai-ml-workshop",
    title: "AI/ML Workshop by Prof. Shah",
    description:
      "A two-day intensive workshop on deep learning fundamentals — feedforward nets, CNNs, RNNs, and a brief intro to transformers. Day 1 covers theory + PyTorch basics; Day 2 is a mini-project (image classifier on CIFAR-10). Registration closes Aug 17.",
    category: "WORKSHOP",
    startTime: ts("2026-08-19T09:30:00"),
    endTime: ts("2026-08-19T17:00:00"),
    venueSlug: "computer-centre",
    organizer: "AI/ML Reading Group, IITGN",
    tags: ["Deep Learning", "PyTorch", "Hands-on", "Registration Required"],
    capacity: 50,
    registeredCount: 38,
    isFeatured: true,
  },
  {
    id: "evt-inter-hostel-football",
    title: "Inter-Hostel Football Tournament — Day 1",
    description:
      "Kickoff of the annual Inter-Hostel Football Championship. Day 1 features Hostel 1 vs Hostel 2 (4:00 PM) and Hostel 3 vs Hostel 4 (5:30 PM). League format; finals on Aug 25. Cheer your hostel — bring banners and water for the players.",
    category: "SPORTS",
    startTime: ts("2026-08-20T16:00:00"),
    endTime: ts("2026-08-20T19:00:00"),
    venueSlug: "football-ground",
    organizer: "Sports Council, IITGN",
    tags: ["Football", "Inter-Hostel", "League", "Floodlit"],
    capacity: 200,
    registeredCount: 88,
    isFeatured: false,
  },
  {
    id: "evt-hackathon-2026",
    title: "Hackathon 2026: Build for Bharat",
    description:
      "24-hour hackathon with problem statements in agri-tech, health-tech and climate-tech. ₹50,000 prize pool. Teams of up to 4. Mentors from industry + faculty. Free food and caffeine throughout. Kickoff at 10 AM on Aug 22; demos at 10 AM on Aug 23.",
    category: "TECHNICAL",
    startTime: ts("2026-08-22T10:00:00"),
    endTime: ts("2026-08-23T11:00:00"),
    venueSlug: "ab1",
    organizer: "Innovation Cell & SAC, IITGN",
    tags: ["Hackathon", "24-hour", "Prize Pool", "Team Event"],
    capacity: 120,
    registeredCount: 96,
    isFeatured: true,
  },
  {
    id: "evt-hallmark-2026",
    title: "Hallmark 2026 Cultural Fest",
    description:
      "The flagship annual cultural fest of IITGN — three nights of music, dance, theatre and stand-up. Headliner: The Local Train (Aug 23). Inter-college competitions in dramatics, fashion, classical & western vocals. Passes at the help desk near the Amphitheatre.",
    category: "CULTURAL",
    startTime: ts("2026-08-21T18:00:00"),
    endTime: ts("2026-08-23T23:30:00"),
    venueSlug: "amphitheatre",
    organizer: "Cultural Committee & SAC, IITGN",
    tags: ["Cultural Fest", "Headliner", "Inter-college", "Pass Required"],
    capacity: 800,
    registeredCount: 612,
    isFeatured: true,
  },
  {
    id: "evt-dandiya-night",
    title: "Dandiya Night 2026",
    description:
      "Celebrate Navratri on campus with a live dandiya raas night. Dandiyas available on rent at the venue. Dandiya-Garba workshop for beginners at 7:00 PM; main event 8:00 PM onwards. Traditional attire encouraged. Snacks and chaat stalls by the Shopping Complex.",
    category: "CULTURAL",
    startTime: ts("2026-08-24T19:00:00"),
    endTime: ts("2026-08-24T22:30:00"),
    venueSlug: "central-plaza",
    organizer: "Cultural Committee & Gujarati Sahitya Mandal",
    tags: ["Navratri", "Dandiya", "Workshop", "Open to All"],
    capacity: 500,
    registeredCount: 234,
    isFeatured: false,
  },
  {
    id: "evt-research-symposium",
    title: "Research Paper Symposium 2026",
    description:
      "A full-day symposium where final-year UG and PG students present their capstone / thesis work. Three parallel tracks: Engineering, Sciences, and Humanities & Social Sciences. Poster session 11 AM – 1 PM; oral talks 2 PM – 6 PM. Faculty and external reviewers in attendance.",
    category: "ACADEMIC",
    startTime: ts("2026-08-26T09:00:00"),
    endTime: ts("2026-08-26T18:00:00"),
    venueSlug: "lhc",
    organizer: "Office of Research & Development, IITGN",
    tags: ["Research", "Presentations", "Poster Session", "Open to All"],
    capacity: 250,
    registeredCount: 142,
    isFeatured: false,
  },
  {
    id: "evt-debate-competition",
    title: "Inter-Department Debate Competition",
    description:
      "Parliamentary-style debate competition with teams from all departments. Topic for the finals: \"This house believes that AI-generated art should not be eligible for copyright.\" Cash prizes for best speaker and best team. Audience Q&A after each round.",
    category: "ACADEMIC",
    startTime: ts("2026-08-28T16:00:00"),
    endTime: ts("2026-08-28T19:30:00"),
    venueSlug: "lhc",
    organizer: "Debate & Literary Society, IITGN",
    tags: ["Debate", "Inter-Department", "Prizes", "Audience Welcome"],
    capacity: 150,
    registeredCount: 67,
    isFeatured: false,
  },
  {
    id: "evt-alumni-meet",
    title: "Alumni Meet 2026 — Batch of 2016 Reunion",
    description:
      "The 10-year reunion of the 2016 graduating batch. Campus walk at 4:30 PM, formal dinner at 7:30 PM. A special panel discussion on \"Decade of IITGN Alumni in Industry & Academia\" at 6 PM. Family members welcome; prior registration required for catering.",
    category: "SOCIAL",
    startTime: ts("2026-08-30T16:30:00"),
    endTime: ts("2026-08-30T21:00:00"),
    venueSlug: "dining-hall",
    organizer: "Alumni Association, IITGN",
    tags: ["Reunion", "Alumni", "Dinner", "Registration Required"],
    capacity: 180,
    registeredCount: 94,
    isFeatured: false,
  },
];

/* ── Helpers (all derived from SAMPLE_EVENTS; no extra wiring needed) ─── */

/** Returns the full list of sample events (unsorted, source order). */
export function getAllEvents(): CampusEvent[] {
  return [...SAMPLE_EVENTS];
}

/** Returns true if the event's start day matches today's calendar day. */
export function isEventToday(event: CampusEvent): boolean {
  const now = new Date();
  const start = new Date(event.startTime);
  return (
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate()
  );
}

/** Returns true if "now" falls inside the event's [startTime, endTime] window. */
export function isEventOngoing(event: CampusEvent): boolean {
  const now = Date.now();
  const start = new Date(event.startTime).getTime();
  const end = new Date(event.endTime).getTime();
  return now >= start && now <= end;
}

/** Returns true if the event has not yet started. */
export function isEventUpcoming(event: CampusEvent): boolean {
  return Date.now() < new Date(event.startTime).getTime();
}

/** Returns true if the event has already ended. */
export function isEventPast(event: CampusEvent): boolean {
  return Date.now() > new Date(event.endTime).getTime();
}

/** Today's events (sorted by start time asc). */
export function getTodayEvents(): CampusEvent[] {
  return SAMPLE_EVENTS.filter(isEventToday).sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

/** Upcoming events (end > now), sorted by start time asc. Optional limit. */
export function getUpcomingEvents(limit?: number): CampusEvent[] {
  const now = Date.now();
  const items = SAMPLE_EVENTS.filter(
    (e) => new Date(e.endTime).getTime() > now,
  ).sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

/** Past events (end < now), sorted by start time desc (most recent first). */
export function getPastEvents(): CampusEvent[] {
  const now = Date.now();
  return SAMPLE_EVENTS.filter(
    (e) => new Date(e.endTime).getTime() < now,
  ).sort(
    (a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
}

/** Filter events by category (sorted by start time asc). */
export function getEventsByCategory(cat: EventCategory): CampusEvent[] {
  return SAMPLE_EVENTS.filter((e) => e.category === cat).sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

/** Look up a single event by id. */
export function getEventById(id: string): CampusEvent | null {
  return SAMPLE_EVENTS.find((e) => e.id === id) ?? null;
}

/** Convenience: friendly venue label lookup (mirrors POI_DETAILS keys). */
export const EVENT_VENUE_NAMES: Record<string, string> = {
  "amphitheatre": "Amphitheatre",
  "ab1": "Academic Block 1 (AB1)",
  "ab2": "Academic Block 2 (AB2)",
  "ab3": "Academic Block 3 (AB3 / Labs)",
  "library": "Library & Learning Resource Centre",
  "lhc": "Lecture Hall Complex (LHC)",
  "sports-complex": "Sports Complex (Gym)",
  "football-ground": "Football / Cricket Ground",
  "tennis-courts": "Tennis & Basketball Courts",
  "central-plaza": "Central Plaza (Quad)",
  "dining-hall": "Dining Hall (Mess)",
  "shopping-complex": "Shopping Complex (Amul)",
  "computer-centre": "Computer Centre",
  "admin-block": "Administration Block",
  "health-centre": "Health Centre",
};

/** Get a friendly venue name from a slug, with a sensible fallback. */
export function getEventVenueName(venueSlug: string): string {
  return EVENT_VENUE_NAMES[venueSlug] ?? venueSlug;
}
