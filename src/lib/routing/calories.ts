/**
 * Calorie burn estimation utilities.
 *
 * Estimates calories burned walking a route based on:
 * - Distance (metres)
 * - Walking mode (RELAXED / NORMAL / HURRY)
 * - User pace (m/s, from the Walking Buddy slider)
 *
 * The formula uses MET (Metabolic Equivalent of Task) values from the
 * Compendium of Physical Activities, multiplied by body weight (kg) and
 * duration (hours). A default body weight of 65 kg is used (avg adult in
 * India per WHO data) — this is intentionally conservative.
 *
 * References:
 * - Ainsworth et al. 2011 Compendium of Physical Activities
 * - Walking METs by speed:
 *   - Slow stroll (0.6 m/s ≈ 2.1 km/h) → MET 2.5
 *   - Normal (1.2 m/s ≈ 4.3 km/h) → MET 3.5
 *   - Brisk (1.4 m/s ≈ 5.0 km/h) → MET 4.3
 *   - Power (1.8 m/s ≈ 6.4 km/h) → MET 6.3
 */

import type { RouteResult, WalkingMode } from "./types";

/** Default body weight (kg) for calorie estimation. */
export const DEFAULT_BODY_WEIGHT_KG = 65;

/** MET value lookup by walking mode. */
export const MODE_MET: Record<WalkingMode, number> = {
  RELAXED: 2.5,
  NORMAL: 3.5,
  HURRY: 4.3,
};

/** Pace (m/s) → MET interpolation breakpoints (slow→power). */
const PACE_MET_BREAKPOINTS: Array<{ pace: number; met: number }> = [
  { pace: 0.4, met: 2.0 },
  { pace: 0.6, met: 2.5 },
  { pace: 1.0, met: 3.0 },
  { pace: 1.2, met: 3.5 },
  { pace: 1.4, met: 4.3 },
  { pace: 1.6, met: 5.3 },
  { pace: 1.8, met: 6.3 },
  { pace: 2.0, met: 7.0 },
];

/**
 * Estimate MET from pace (m/s) via linear interpolation between
 * `PACE_MET_BREAKPOINTS`. Clamps to the first/last breakpoint outside the range.
 */
export function paceToMet(pace: number): number {
  if (pace <= PACE_MET_BREAKPOINTS[0]!.pace) return PACE_MET_BREAKPOINTS[0]!.met;
  const last = PACE_MET_BREAKPOINTS[PACE_MET_BREAKPOINTS.length - 1]!;
  if (pace >= last.pace) return last.met;
  for (let i = 1; i < PACE_MET_BREAKPOINTS.length; i++) {
    const a = PACE_MET_BREAKPOINTS[i - 1]!;
    const b = PACE_MET_BREAKPOINTS[i]!;
    if (pace >= a.pace && pace <= b.pace) {
      const t = (pace - a.pace) / (b.pace - a.pace);
      return a.met + t * (b.met - a.met);
    }
  }
  return 3.5; // fallback
}

/**
 * Estimate calories burned for a given route + mode.
 *
 * @param routeM Distance in metres
 * @param durationS Duration in seconds
 * @param mode Walking mode (RELAXED/NORMAL/HURRY)
 * @param bodyWeightKg Optional body weight (default 65 kg)
 * @returns Calories burned (kcal), rounded to the nearest integer
 */
export function estimateCalories(
  routeM: number,
  durationS: number,
  mode: WalkingMode,
  bodyWeightKg: number = DEFAULT_BODY_WEIGHT_KG,
): number {
  const hours = durationS / 3600;
  const met = MODE_MET[mode];
  const kcal = met * bodyWeightKg * hours;
  return Math.max(0, Math.round(kcal));
}

/**
 * Estimate calories burned for a given route + user's personal pace (m/s).
 *
 * Uses pace-based MET lookup (more accurate than mode-based) when the user
 * has set a custom pace via the Walking Buddy slider. Falls back to mode-based
 * if pace is undefined.
 *
 * @param routeM Distance in metres
 * @param durationS Duration in seconds (route.durationS)
 * @param pace User's personal pace (m/s) — from Walking Buddy slider
 * @param bodyWeightKg Optional body weight (default 65 kg)
 * @returns Calories burned (kcal), rounded to the nearest integer
 */
export function estimateCaloriesByPace(
  routeM: number,
  durationS: number,
  pace: number,
  bodyWeightKg: number = DEFAULT_BODY_WEIGHT_KG,
): number {
  // Recompute duration if route duration doesn't match the user's pace
  // (the API returns duration based on mode, not user pace — so if the user
  // picked a custom pace, we estimate duration = distance / pace).
  const effectiveDurationS = routeM > 0 && pace > 0 ? routeM / pace : durationS;
  const hours = effectiveDurationS / 3600;
  const met = paceToMet(pace);
  const kcal = met * bodyWeightKg * hours;
  return Math.max(0, Math.round(kcal));
}

/**
 * Estimate calories for a RouteResult + optional user pace.
 * Convenience wrapper that handles null/undefined routes gracefully.
 */
export function estimateCaloriesForRoute(
  route: RouteResult | null | undefined,
  pace?: number,
  bodyWeightKg: number = DEFAULT_BODY_WEIGHT_KG,
): number {
  if (!route) return 0;
  if (typeof pace === "number" && pace > 0) {
    return estimateCaloriesByPace(route.distanceM, route.durationS, pace, bodyWeightKg);
  }
  return 0;
}

/**
 * Calorie category for styling/coloring.
 */
export type CalorieCategory = "low" | "medium" | "high" | "intense";

export function calorieCategory(kcal: number): CalorieCategory {
  if (kcal < 15) return "low";
  if (kcal < 35) return "medium";
  if (kcal < 60) return "high";
  return "intense";
}

/** Color tokens by category — all non-indigo, non-blue. */
export const CALORIE_CATEGORY_COLOR: Record<CalorieCategory, string> = {
  low: "text-teal-600 dark:text-teal-400",
  medium: "text-emerald-600 dark:text-emerald-400",
  high: "text-amber-600 dark:text-amber-400",
  intense: "text-rose-600 dark:text-rose-400",
};

/** Badge label by category. */
export const CALORIE_CATEGORY_LABEL: Record<CalorieCategory, string> = {
  low: "Light burn",
  medium: "Moderate burn",
  high: "Solid burn",
  intense: "Power burn",
};
