/**
 * Achievement Streak Tracker — daily walking streak counter.
 *
 * Persists streak data to localStorage (`iitgn-streak`).
 * Uses plain Date + ISO date strings (YYYY-MM-DD) — no external date libs.
 *
 * Call `updateStreak()` when a journey is COMPLETED (not started).
 */

/* ── Types ────────────────────────────────────────────────────────────── */

export interface StreakData {
  /** Current consecutive-day walking streak. */
  currentStreak: number;
  /** All-time longest streak. */
  longestStreak: number;
  /** ISO date string (YYYY-MM-DD) of the last walk day, or null. */
  lastWalkDate: string | null;
  /** Total number of days on which at least one walk was completed. */
  totalWalkDays: number;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

export const STREAK_KEY = "iitgn-streak";

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastWalkDate: null,
  totalWalkDays: 0,
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Get today's date as YYYY-MM-DD in the local timezone. */
function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Get yesterday's date as YYYY-MM-DD in the local timezone. */
function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Validate that a string is a YYYY-MM-DD date. */
function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + "T00:00:00").getTime());
}

/* ── Persistence ──────────────────────────────────────────────────────── */

/** Load streak data from localStorage. Returns defaults on failure. */
export function loadStreak(): StreakData {
  if (typeof window === "undefined") return { ...DEFAULT_STREAK };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { ...DEFAULT_STREAK };
    const parsed = JSON.parse(raw) as Partial<StreakData>;
    // Validate fields
    return {
      currentStreak: typeof parsed.currentStreak === "number" ? parsed.currentStreak : 0,
      longestStreak: typeof parsed.longestStreak === "number" ? parsed.longestStreak : 0,
      lastWalkDate:
        parsed.lastWalkDate !== null && parsed.lastWalkDate !== undefined && isValidDate(parsed.lastWalkDate)
          ? parsed.lastWalkDate
          : null,
      totalWalkDays: typeof parsed.totalWalkDays === "number" ? parsed.totalWalkDays : 0,
    };
  } catch {
    return { ...DEFAULT_STREAK };
  }
}

/** Save streak data to localStorage. */
export function saveStreak(data: StreakData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

/**
 * Update the streak after a journey is completed.
 *
 * - If today is already counted → no change (idempotent).
 * - If yesterday was the last walk day → streak continues (+1).
 * - If there's a gap (last walk was before yesterday) → streak resets to 1.
 * - If first ever walk → streak = 1.
 *
 * Updates `longestStreak` and `totalWalkDays` accordingly.
 * Persists to localStorage and returns the updated data.
 */
export function updateStreak(): StreakData {
  const data = loadStreak();
  const today = todayIso();

  // Already counted today — no change.
  if (data.lastWalkDate === today) return data;

  const yesterday = yesterdayIso();
  let newStreak: number;

  if (data.lastWalkDate === yesterday) {
    // Consecutive — extend streak.
    newStreak = data.currentStreak + 1;
  } else {
    // Gap or first ever — reset to 1.
    newStreak = 1;
  }

  const updated: StreakData = {
    currentStreak: newStreak,
    longestStreak: Math.max(data.longestStreak, newStreak),
    lastWalkDate: today,
    totalWalkDays: data.totalWalkDays + 1,
  };

  saveStreak(updated);
  return updated;
}
