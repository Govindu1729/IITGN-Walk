/**
 * Quick Commute — time-aware route suggestions for IITGN campus life.
 *
 * Based on the current hour of the day, suggests common routes that a student
 * is likely to take (e.g., hostel→class in the morning, any→dining at lunch).
 * All slugs reference real campus locations from seed.ts.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommuteSuggestion {
  /** Origin location slug (must exist in seed.ts). */
  fromSlug: string;
  /** Human-readable origin label. */
  fromLabel: string;
  /** Destination location slug (must exist in seed.ts). */
  toSlug: string;
  /** Human-readable destination label. */
  toLabel: string;
  /** Short reason for this suggestion (e.g., "Morning class"). */
  reason: string;
  /** Lucide icon hint: "class" | "dining" | "study" | "sports" | "night" */
  icon: "class" | "dining" | "study" | "sports" | "night";
}

export type TimeContext = "morning" | "midday" | "afternoon" | "evening" | "night";

// ─── Time context ─────────────────────────────────────────────────────────────

export function getTimeContext(hour: number): TimeContext {
  if (hour >= 6 && hour < 10) return "morning";
  if (hour >= 10 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

// ─── Suggestion data (hardcoded but realistic) ────────────────────────────────

const SUGGESTIONS: Record<TimeContext, CommuteSuggestion[]> = {
  morning: [
    {
      fromSlug: "hostel-3",
      fromLabel: "Hostel 3",
      toSlug: "ab1",
      toLabel: "Academic Block 1",
      reason: "Morning class",
      icon: "class",
    },
    {
      fromSlug: "hostel-5",
      fromLabel: "Hostel 5",
      toSlug: "lhc",
      toLabel: "Lecture Hall Complex",
      reason: "Lecture hall",
      icon: "class",
    },
    {
      fromSlug: "hostel-1",
      fromLabel: "Hostel 1",
      toSlug: "ab3",
      toLabel: "Academic Block 3",
      reason: "Lab session",
      icon: "class",
    },
  ],
  midday: [
    {
      fromSlug: "ab1",
      fromLabel: "Academic Block 1",
      toSlug: "dining-hall",
      toLabel: "Dining Hall",
      reason: "Lunch break",
      icon: "dining",
    },
    {
      fromSlug: "lhc",
      fromLabel: "Lecture Hall Complex",
      toSlug: "dining-hall",
      toLabel: "Dining Hall",
      reason: "Lunch at mess",
      icon: "dining",
    },
    {
      fromSlug: "library",
      fromLabel: "Library",
      toSlug: "dining-hall",
      toLabel: "Dining Hall",
      reason: "Study break lunch",
      icon: "dining",
    },
  ],
  afternoon: [
    {
      fromSlug: "ab1",
      fromLabel: "Academic Block 1",
      toSlug: "library",
      toLabel: "Library",
      reason: "Afternoon study",
      icon: "study",
    },
    {
      fromSlug: "dining-hall",
      fromLabel: "Dining Hall",
      toSlug: "library",
      toLabel: "Library",
      reason: "Post-lunch study",
      icon: "study",
    },
    {
      fromSlug: "ab3",
      fromLabel: "Academic Block 3",
      toSlug: "sports-complex",
      toLabel: "Sports Complex",
      reason: "After-class workout",
      icon: "sports",
    },
  ],
  evening: [
    {
      fromSlug: "library",
      fromLabel: "Library",
      toSlug: "sports-complex",
      toLabel: "Sports Complex",
      reason: "Evening workout",
      icon: "sports",
    },
    {
      fromSlug: "ab1",
      fromLabel: "Academic Block 1",
      toSlug: "sports-complex",
      toLabel: "Sports Complex",
      reason: "Hit the gym",
      icon: "sports",
    },
    {
      fromSlug: "dining-hall",
      fromLabel: "Dining Hall",
      toSlug: "sports-complex",
      toLabel: "Sports Complex",
      reason: "Post-dinner walk",
      icon: "sports",
    },
  ],
  night: [
    {
      fromSlug: "library",
      fromLabel: "Library",
      toSlug: "hostel-3",
      toLabel: "Hostel 3",
      reason: "Head back to hostel",
      icon: "night",
    },
    {
      fromSlug: "ab1",
      fromLabel: "Academic Block 1",
      toSlug: "hostel-1",
      toLabel: "Hostel 1",
      reason: "Return to room",
      icon: "night",
    },
    {
      fromSlug: "sports-complex",
      fromLabel: "Sports Complex",
      toSlug: "hostel-5",
      toLabel: "Hostel 5",
      reason: "Back from sports",
      icon: "night",
    },
  ],
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns 2-3 commute suggestions based on the given hour (0-23). */
export function getCommuteSuggestions(hour: number): CommuteSuggestion[] {
  const ctx = getTimeContext(hour);
  return SUGGESTIONS[ctx];
}

/** Emoji + label for a time context, used in the UI badge. */
export const TIME_CONTEXT_LABEL: Record<TimeContext, { emoji: string; label: string }> = {
  morning: { emoji: "🌅", label: "Morning" },
  midday: { emoji: "☀️", label: "Midday" },
  afternoon: { emoji: "📚", label: "Afternoon" },
  evening: { emoji: "🏃", label: "Evening" },
  night: { emoji: "🌙", label: "Night" },
};
