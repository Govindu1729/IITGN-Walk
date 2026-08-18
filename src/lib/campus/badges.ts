/**
 * Achievement Badges + Unlocks — collectible milestone badges for the
 * IITGN Walk campus navigation app.
 *
 * Distinct from `src/lib/walking-stats.ts` (which tracks per-journey stats
 * and a separate set of 12 progress badges). This module defines 10
 * tier-graded collectible badges that unlock on cross-cutting milestones
 * (first journey, time-of-day, distance, streak, exploration, mode, weather,
 * repeat visits).
 *
 * Persists to localStorage (`iitgn-badges`). All evaluation is idempotent:
 * calling `evaluateBadges` twice with the same context returns no new
 * unlocks the second time.
 */

/* ── Types ────────────────────────────────────────────────────────────── */

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export type BadgeCategory =
  | "distance"
  | "streak"
  | "time"
  | "location"
  | "mode"
  | "weather";

export interface Badge {
  /** Stable identifier persisted to localStorage. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Short description of how to unlock. */
  description: string;
  /** Lucide icon name (resolved by the UI layer). */
  icon: string;
  tier: BadgeTier;
  category: BadgeCategory;
}

/** Map of `badgeId` → unlock metadata. Persisted as a single JSON blob. */
export type UnlockedBadges = Record<string, { unlockedAt: string }>;

/* ── Constants ─────────────────────────────────────────────────────────── */

export const BADGES_KEY = "iitgn-badges";

/**
 * The 10 collectible milestone badges. Tiers are assigned by difficulty:
 *  - bronze   : immediate / single-event unlocks
 *  - silver   : sustained habit or modest exploration
 *  - gold     : meaningful cumulative effort
 *  - platinum : rare, high-dedication achievement
 */
export const BADGES: Badge[] = [
  {
    id: "first-steps",
    name: "First Steps",
    description: "Complete your first journey on campus.",
    icon: "Footprints",
    tier: "bronze",
    category: "distance",
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Complete a journey before 8 AM.",
    icon: "Sunrise",
    tier: "silver",
    category: "time",
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "Complete a journey after 9 PM.",
    icon: "Moon",
    tier: "silver",
    category: "time",
  },
  {
    id: "marathon-walker",
    name: "Marathon Walker",
    description: "Walk 5+ km cumulative across all journeys.",
    icon: "Trophy",
    tier: "gold",
    category: "distance",
  },
  {
    id: "consistent",
    name: "Consistent",
    description: "Maintain a 3-day walking streak.",
    icon: "CalendarCheck",
    tier: "silver",
    category: "streak",
  },
  {
    id: "explorer",
    name: "Explorer",
    description: "Visit 5+ unique campus locations.",
    icon: "Compass",
    tier: "silver",
    category: "location",
  },
  {
    id: "speedster",
    name: "Speedster",
    description: "Complete a journey in HURRY mode.",
    icon: "Zap",
    tier: "bronze",
    category: "mode",
  },
  {
    id: "rain-walker",
    name: "Rain Walker",
    description: "Complete a journey in rainy weather.",
    icon: "CloudRain",
    tier: "bronze",
    category: "weather",
  },
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Visit the Dining Hall 3+ times.",
    icon: "Users",
    tier: "gold",
    category: "location",
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "Visit the Library 5+ times.",
    icon: "GraduationCap",
    tier: "platinum",
    category: "location",
  },
];

/* ── Persistence ──────────────────────────────────────────────────────── */

/** Load the unlocked-badges map from localStorage. Returns `{}` on failure. */
export function loadBadges(): UnlockedBadges {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: UnlockedBadges = {};
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof key === "string" &&
        val &&
        typeof val === "object" &&
        !Array.isArray(val) &&
        "unlockedAt" in val &&
        typeof (val as { unlockedAt: unknown }).unlockedAt === "string"
      ) {
        // Validate the badge id is one we recognise (silently drop unknowns
        // so stale entries from renamed badges don't linger forever).
        if (BADGES.some((b) => b.id === key)) {
          result[key] = { unlockedAt: (val as { unlockedAt: string }).unlockedAt };
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** Persist the unlocked-badges map to localStorage. */
export function saveBadges(data: UnlockedBadges): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BADGES_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

/* ── Evaluation ──────────────────────────────────────────────────────── */

/** Context passed to `evaluateBadges` describing the user's current state. */
export interface BadgeEvalContext {
  /** Total number of completed journeys. */
  journeyCount: number;
  /** Cumulative walking distance across all journeys, in metres. */
  totalDistanceM: number;
  /** Current consecutive-day walking streak. */
  currentStreak: number;
  /** Distinct location slugs ever visited. */
  uniqueLocations: string[];
  /** Number of visits to the Dining Hall. */
  visitedDiningHall: number;
  /** Number of visits to the Library. */
  visitedLibrary: number;
  /** Has the user ever completed a journey before 8 AM? */
  hasEarlyJourney: boolean;
  /** Has the user ever completed a journey after 9 PM? */
  hasNightJourney: boolean;
  /** Has the user ever completed a journey in HURRY mode? */
  hasHurryJourney: boolean;
  /** Has the user ever completed a journey in rainy weather? */
  hasRainyJourney: boolean;
}

/**
 * Evaluate the badge context against all 10 badges and return ONLY the
 * newly-unlocked badge ids (those that are now satisfied but were not
 * already in localStorage).
 *
 * Side-effect-free with respect to localStorage: the caller is responsible
 * for persisting the merged unlock map (typically via `saveBadges`).
 * Idempotent: a second call with the same context returns `[]` once the
 * badges have been persisted.
 */
export function evaluateBadges(ctx: BadgeEvalContext): string[] {
  const already = loadBadges();
  const newlyUnlocked: string[] = [];

  const checks: Record<string, boolean> = {
    "first-steps": ctx.journeyCount >= 1,
    "early-bird": ctx.hasEarlyJourney,
    "night-owl": ctx.hasNightJourney,
    "marathon-walker": ctx.totalDistanceM >= 5000,
    "consistent": ctx.currentStreak >= 3,
    "explorer": ctx.uniqueLocations.length >= 5,
    "speedster": ctx.hasHurryJourney,
    "rain-walker": ctx.hasRainyJourney,
    "social-butterfly": ctx.visitedDiningHall >= 3,
    "scholar": ctx.visitedLibrary >= 5,
  };

  for (const badge of BADGES) {
    if (already[badge.id]) continue; // already unlocked — skip
    if (checks[badge.id]) {
      newlyUnlocked.push(badge.id);
    }
  }

  return newlyUnlocked;
}
