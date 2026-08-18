// Gamification: walking stats + badge definitions + unlock logic.
// Stats are persisted to localStorage under `iitgn-walking-stats`.
// On every journey completion, page.tsx calls recordJourney() with the new
// journey's stats and current context (mode, accessibility, weather, time of day).
// recordJourney returns the list of newly unlocked badge IDs so the caller
// can surface celebratory toasts.

import type { WalkingMode } from "@/lib/routing/types";

export interface WalkingStats {
  totalDistanceM: number;
  totalJourneys: number;
  totalTimeS: number;
  streakDays: number;
  /** ISO date string (YYYY-MM-DD) of the last walk taken. */
  lastWalkDate: string | null;
  badges: string[];
  /** How many journeys used accessible routes. */
  accessibleRouteCount: number;
  /** Distinct walking modes ever used. */
  modesTried: WalkingMode[];
  /** Distinct destination slugs ever visited. */
  visitedDestinations: string[];
}

export const DEFAULT_STATS: WalkingStats = {
  totalDistanceM: 0,
  totalJourneys: 0,
  totalTimeS: 0,
  streakDays: 0,
  lastWalkDate: null,
  badges: [],
  accessibleRouteCount: 0,
  modesTried: [],
  visitedDestinations: [],
};

const STORAGE_KEY = "iitgn-walking-stats";

export function loadStats(): WalkingStats {
  if (typeof window === "undefined") return { ...DEFAULT_STATS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw) as Partial<WalkingStats>;
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveStats(s: WalkingStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/* ────────────────────────────────────────────────────────────────────────
   Badge definitions
   ──────────────────────────────────────────────────────────────────────── */

export interface BadgeDef {
  id: string;
  label: string;
  description: string;
  emoji: string;
  /** Tailwind classes for the badge when unlocked (gradient + text color). */
  unlockedClass: string;
  /** Function that returns the progress ratio 0..1 (1 = unlocked) given stats. */
  progress: (s: WalkingStats, ctx: BadgeContext) => number;
  /** Function that returns the human-readable current/target string. */
  progressLabel?: (s: WalkingStats, ctx: BadgeContext) => string;
}

export interface BadgeContext {
  /** Whether the just-completed journey was after 8 PM. */
  wasNight?: boolean;
  /** Whether the just-completed journey was before 7 AM. */
  wasEarly?: boolean;
  /** Whether the journey was completed in rainy weather. */
  wasRainy?: boolean;
}

export const BADGES: BadgeDef[] = [
  {
    id: "first-walk",
    label: "First Steps",
    description: "Complete your first journey",
    emoji: "🎯",
    unlockedClass:
      "bg-gradient-to-br from-emerald-400 to-teal-500 text-white",
    progress: (s) => (s.totalJourneys >= 1 ? 1 : 0),
  },
  {
    id: "distance-1km",
    label: "Kilometre Club",
    description: "Walk 1 km total",
    emoji: "🏃",
    unlockedClass: "bg-gradient-to-br from-sky-400 to-cyan-500 text-white",
    progress: (s) => Math.min(1, s.totalDistanceM / 1000),
    progressLabel: (s) => `${(s.totalDistanceM / 1000).toFixed(2)}/1.00 km`,
  },
  {
    id: "distance-5km",
    label: "Pathfinder",
    description: "Walk 5 km total",
    emoji: "🚶",
    unlockedClass: "bg-gradient-to-br from-violet-400 to-purple-500 text-white",
    progress: (s) => Math.min(1, s.totalDistanceM / 5000),
    progressLabel: (s) => `${(s.totalDistanceM / 1000).toFixed(2)}/5.00 km`,
  },
  {
    id: "distance-10km",
    label: "Marathon Walker",
    description: "Walk 10 km total",
    emoji: "🏆",
    unlockedClass:
      "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
    progress: (s) => Math.min(1, s.totalDistanceM / 10000),
    progressLabel: (s) => `${(s.totalDistanceM / 1000).toFixed(2)}/10.00 km`,
  },
  {
    id: "streak-3",
    label: "On a Roll",
    description: "3-day walking streak",
    emoji: "🔥",
    unlockedClass: "bg-gradient-to-br from-orange-400 to-red-500 text-white",
    progress: (s) => Math.min(1, s.streakDays / 3),
    progressLabel: (s) => `${s.streakDays}/3 days`,
  },
  {
    id: "streak-7",
    label: "Week Walker",
    description: "7-day walking streak",
    emoji: "⭐",
    unlockedClass: "bg-gradient-to-br from-yellow-400 to-amber-500 text-white",
    progress: (s) => Math.min(1, s.streakDays / 7),
    progressLabel: (s) => `${s.streakDays}/7 days`,
  },
  {
    id: "night-walker",
    label: "Night Walker",
    description: "Complete a journey after 8 PM",
    emoji: "🌙",
    unlockedClass: "bg-gradient-to-br from-violet-500 to-purple-700 text-white",
    progress: (s, ctx) =>
      s.badges.includes("night-walker") || ctx.wasNight ? 1 : 0,
  },
  {
    id: "early-bird",
    label: "Early Bird",
    description: "Complete a journey before 7 AM",
    emoji: "🌅",
    unlockedClass:
      "bg-gradient-to-br from-rose-300 to-amber-400 text-white",
    progress: (s, ctx) =>
      s.badges.includes("early-bird") || ctx.wasEarly ? 1 : 0,
  },
  {
    id: "rain-warrior",
    label: "Rain Warrior",
    description: "Complete a journey in rainy weather",
    emoji: "🌧️",
    unlockedClass: "bg-gradient-to-br from-sky-500 to-blue-700 text-white",
    progress: (s, ctx) =>
      s.badges.includes("rain-warrior") || ctx.wasRainy ? 1 : 0,
  },
  {
    id: "accessibility-champion",
    label: "Accessibility Champion",
    description: "Use accessible routes 5 times",
    emoji: "♿",
    unlockedClass: "bg-gradient-to-br from-teal-500 to-emerald-600 text-white",
    progress: (s) => Math.min(1, s.accessibleRouteCount / 5),
    progressLabel: (s) => `${s.accessibleRouteCount}/5 routes`,
  },
  {
    id: "all-rounder",
    label: "All-Rounder",
    description: "Try all 3 walking modes",
    emoji: "🎭",
    unlockedClass: "bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white",
    progress: (s) => Math.min(1, s.modesTried.length / 3),
    progressLabel: (s) => `${s.modesTried.length}/3 modes`,
  },
  {
    id: "explorer",
    label: "Explorer",
    description: "Visit 10 different destinations",
    emoji: "🗺️",
    unlockedClass: "bg-gradient-to-br from-lime-400 to-emerald-500 text-white",
    progress: (s) => Math.min(1, s.visitedDestinations.length / 10),
    progressLabel: (s) => `${s.visitedDestinations.length}/10 places`,
  },
];

/** Helper: format today as YYYY-MM-DD in local time. */
function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Helper: day difference between two YYYY-MM-DD strings. */
function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export interface RecordJourneyInput {
  distanceM: number;
  durationS: number;
  mode: WalkingMode;
  accessibleOnly: boolean;
  toSlug: string;
  /** ISO timestamp of completion (defaults to now). */
  completedAt?: Date;
  /** Weather condition string from the WeatherData condition field. */
  weatherCondition?: string;
}

/**
 * Record a journey: update stats, recompute streak, evaluate badge progress,
 * and return the list of newly-unlocked badge IDs (for celebratory toasts).
 * Pure-ish: reads current stats, computes next stats, persists, returns deltas.
 */
export function recordJourney(input: RecordJourneyInput): {
  stats: WalkingStats;
  newlyUnlocked: BadgeDef[];
} {
  const now = input.completedAt ?? new Date();
  const today = todayStr(now);
  const hour = now.getHours();

  const prev = loadStats();

  // Streak: 1 if first ever walk; prev.streakDays+1 if last walk was yesterday;
  // reset to 1 if last walk was today (already counted) — no double count;
  // reset to 1 if last walk was >1 day ago.
  let streak = prev.streakDays;
  if (!prev.lastWalkDate) {
    streak = 1;
  } else {
    const diff = dayDiff(prev.lastWalkDate, today);
    if (diff === 0) {
      // Same day — keep streak (do not increment).
      streak = prev.streakDays;
    } else if (diff === 1) {
      streak = prev.streakDays + 1;
    } else {
      streak = 1;
    }
  }

  const modesTried: WalkingMode[] = Array.from(
    new Set([...prev.modesTried, input.mode]),
  );
  const visitedDestinations = Array.from(
    new Set([...prev.visitedDestinations, input.toSlug]),
  );
  const accessibleRouteCount =
    prev.accessibleRouteCount + (input.accessibleOnly ? 1 : 0);

  const next: WalkingStats = {
    totalDistanceM: prev.totalDistanceM + input.distanceM,
    totalJourneys: prev.totalJourneys + 1,
    totalTimeS: prev.totalTimeS + input.durationS,
    streakDays: streak,
    lastWalkDate: today,
    badges: prev.badges,
    accessibleRouteCount,
    modesTried,
    visitedDestinations,
  };

  // Build context for badge evaluation
  const ctx: BadgeContext = {
    wasNight: hour >= 20,
    wasEarly: hour < 7,
    wasRainy: input.weatherCondition === "Rainy",
  };

  // Evaluate badges — unlock any whose progress is now >= 1 and wasn't already unlocked
  const newlyUnlocked: BadgeDef[] = [];
  for (const badge of BADGES) {
    if (next.badges.includes(badge.id)) continue;
    const ratio = badge.progress(next, ctx);
    if (ratio >= 1) {
      next.badges = [...next.badges, badge.id];
      newlyUnlocked.push(badge);
    }
  }

  saveStats(next);
  return { stats: next, newlyUnlocked };
}
