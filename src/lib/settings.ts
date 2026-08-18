// User settings persisted to localStorage. Read by the planner, route comparison,
// navigation panel, weather widget, and the route-compute request.

import type { WalkingMode } from "@/lib/routing/types";

export type Units = "METRIC" | "IMPERIAL";
export type Language = "EN" | "HI";
export type ThemePref = "LIGHT" | "DARK" | "SYSTEM";

export interface Settings {
  /** Default walking mode selected when the planner mounts. */
  defaultWalkingMode: WalkingMode;
  /** If true, the accessibility toggle defaults to on. */
  defaultAccessibleOnly: boolean;
  /** Display units for distances and ETAs. */
  units: Units;
  /** Custom walking speed in m/s to override the learned speed; 0 = use learned. */
  customWalkingSpeedMps: number;
  /** Toggle weather widget visibility in the header. */
  showWeatherWidget: boolean;
  /** Toggle the elevation profile mini-chart in route cards. */
  showElevationProfile: boolean;
  /** UI language (currently informational; EN is the only fully-translated one). */
  language: Language;
  /** Preferred theme — applied to next-themes when set. */
  theme: ThemePref;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultWalkingMode: "NORMAL",
  defaultAccessibleOnly: false,
  units: "METRIC",
  customWalkingSpeedMps: 0,
  showWeatherWidget: true,
  showElevationProfile: true,
  language: "EN",
  theme: "SYSTEM",
};

const STORAGE_KEY = "iitgn-settings";

/** Load settings from localStorage, merging with defaults so missing keys
 *  don't break older installs. */
export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota errors */
  }
}

/** Convenience hook-free getter used by non-React code paths. */
export function readSettings(): Settings {
  return loadSettings();
}
