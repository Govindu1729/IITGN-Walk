// Input validation utilities for IITGN Walk API endpoints.
// Provides type-safe validation for coordinates, route parameters, and user inputs.

import { CAMPUS_BOUNDS } from "./config";

/**
 * Validate that coordinates are within expected campus bounds.
 * Returns true if coordinates are valid and within campus area.
 */
export function isValidCampusCoordinate(lat: number, lng: number): boolean {
  const { north, south, east, west } = CAMPUS_BOUNDS.BOUNDS;

  // Check if latitude is a valid number
  if (typeof lat !== "number" || isNaN(lat)) return false;

  // Check if longitude is a valid number
  if (typeof lng !== "number" || isNaN(lng)) return false;

  // Check bounds
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

/**
 * Validate GPS trace point with accuracy threshold.
 * Returns true if the point is valid and has acceptable accuracy.
 */
export function isValidGPSPoint(
  lat: number,
  lng: number,
  accuracy?: number | null,
  maxAccuracyMeters: number = 20
): boolean {
  if (!isValidCampusCoordinate(lat, lng)) return false;

  // If accuracy is provided, check it's within acceptable range
  if (accuracy !== undefined && accuracy !== null) {
    if (typeof accuracy !== "number" || isNaN(accuracy)) return false;
    if (accuracy > maxAccuracyMeters || accuracy < 0) return false;
  }

  return true;
}

/**
 * Validate walking mode string.
 * Returns true if the mode is one of the allowed values.
 */
export function isValidWalkingMode(mode: string): boolean {
  const validModes = ["leisure", "normal", "hurry"];
  return typeof mode === "string" && validModes.includes(mode.toLowerCase());
}

/**
 * Sanitize and validate route request parameters.
 * Returns validated parameters or null if invalid.
 */
export interface RouteRequestParams {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  mode: string;
}

export function validateRouteRequest(
  params: Partial<RouteRequestParams>
): RouteRequestParams | null {
  const { startLat, startLng, endLat, endLng, mode } = params;

  // Validate all required fields exist
  if (
    startLat === undefined ||
    startLng === undefined ||
    endLat === undefined ||
    endLng === undefined ||
    mode === undefined
  ) {
    return null;
  }

  // Validate coordinates are numbers
  if (
    typeof startLat !== "number" ||
    typeof startLng !== "number" ||
    typeof endLat !== "number" ||
    typeof endLng !== "number"
  ) {
    return null;
  }

  // Validate coordinates are within campus bounds
  if (!isValidCampusCoordinate(startLat, startLng)) return null;
  if (!isValidCampusCoordinate(endLat, endLng)) return null;

  // Validate walking mode
  if (!isValidWalkingMode(mode)) return null;

  return {
    startLat,
    startLng,
    endLat,
    endLng,
    mode,
  };
}

/**
 * Validate journey duration is meaningful (not too short).
 */
export function isValidJourneyDuration(durationSec: number): boolean {
  if (typeof durationSec !== "number" || isNaN(durationSec)) return false;
  return durationSec >= 30; // Minimum 30 seconds to be meaningful
}

/**
 * Clamp a value between min and max bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Safely parse a float from string with fallback.
 */
export function safeParseFloat(value: unknown, fallback: number): number {
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  return fallback;
}

/**
 * Safely parse an integer from string with fallback.
 */
export function safeParseInt(value: unknown, fallback: number): number {
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  if (typeof value === "number" && !isNaN(value)) {
    return Math.floor(value);
  }
  return fallback;
}
