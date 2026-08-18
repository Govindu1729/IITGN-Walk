/**
 * Walking Buddy pace-matcher helpers.
 *
 * Pure-TS utilities that power the "Walking Buddy" panel:
 *  - PACE_STOPS   : named reference paces (Slow / Comfortable / Brisk / Power)
 *  - closestMode  : maps an arbitrary m/s pace to the nearest WalkingMode
 *  - paceDelta    : compares user pace vs route pace, returns a match grade
 *  - buddyMessage : human-friendly coaching message for a given match grade
 *
 * Kept free of React / DOM concerns so it is trivially unit-testable.
 */

import type { WalkingMode } from "@/lib/routing/types";
import { DEFAULT_SPEED_MPS } from "@/lib/routing/types";

/** Named reference paces offered as quick-pick chips in the UI. */
export interface PaceStop {
  key: string;
  label: string;
  /** pace in metres per second */
  value: number;
  emoji: string;
}

export const PACE_STOPS: PaceStop[] = [
  { key: "slow", label: "Slow", value: 0.6, emoji: "🐢" },
  { key: "comfortable", label: "Comfortable", value: 1.0, emoji: "🚶" },
  { key: "brisk", label: "Brisk", value: 1.4, emoji: "🏃" },
  { key: "power", label: "Power", value: 1.8, emoji: "⚡" },
];

/** Slider bounds (m/s). Mirrored by the WalkingBuddy `<Slider>`. */
export const PACE_MIN = 0.4;
export const PACE_MAX = 2.0;
export const PACE_STEP = 0.05;

/**
 * Map an arbitrary pace (m/s) to the closest named {@link WalkingMode} using
 * the canonical default speeds (RELAXED 0.9 / NORMAL 1.25 / HURRY 1.6).
 */
export function closestMode(pace: number): WalkingMode {
  const relaxed = DEFAULT_SPEED_MPS.RELAXED;
  const normal = DEFAULT_SPEED_MPS.NORMAL;
  const hurry = DEFAULT_SPEED_MPS.HURRY;
  // distance to each mode's anchor speed
  const dRelaxed = Math.abs(pace - relaxed);
  const dNormal = Math.abs(pace - normal);
  const dHurry = Math.abs(pace - hurry);
  if (dRelaxed <= dNormal && dRelaxed <= dHurry) return "RELAXED";
  if (dHurry <= dNormal) return "HURRY";
  return "NORMAL";
}

export type MatchKind = "great" | "ok" | "warn" | "bad";
export type Direction = "faster" | "slower";

export interface PaceDelta {
  /** signed percentage difference: positive => route is faster than user */
  pctDiff: number;
  direction: Direction;
  match: MatchKind;
}

/**
 * Compare the user's personal pace against the route's predicted pace.
 *
 * `pctDiff` is signed: positive means the route is *faster* than the user
 * (user will arrive later than predicted), negative means the route is
 * *slower* (user will arrive earlier than predicted).
 *
 * Match grading:
 *  - |pct| ≤ 10 %  → "great"
 *  - 10 % < |pct| ≤ 25 % → "ok"
 *  - 25 % < |pct| ≤ 50 % → "warn"
 *  |pct| > 50 %     → "bad"
 */
export function paceDelta(userPace: number, routePace: number): PaceDelta {
  const safeUser = Math.max(0.05, userPace);
  const safeRoute = Math.max(0.05, routePace);
  const pct = ((safeRoute - safeUser) / safeUser) * 100;
  const direction: Direction = pct >= 0 ? "faster" : "slower";
  const abs = Math.abs(pct);
  let match: MatchKind = "great";
  if (abs > 50) match = "bad";
  else if (abs > 25) match = "warn";
  else if (abs > 10) match = "ok";
  return { pctDiff: pct, direction, match };
}

/**
 * Produce a short coaching message based on the match grade and direction.
 * `direction = "faster"` means the *route* is faster than the user's pace.
 */
export function buddyMessage(match: MatchKind, direction: Direction): string {
  if (match === "great") return "Great match — you'll arrive on time";
  if (direction === "slower") {
    // route is slower than user's natural pace → relaxing is fine
    return "Slower route — Relax mode will be fine";
  }
  // route is faster than user
  if (match === "ok") return "Slightly faster — leave 1 min earlier";
  return "Much faster route — try Hurry mode";
}
