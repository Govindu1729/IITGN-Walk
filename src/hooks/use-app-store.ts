"use client";

import { create } from "zustand";
import type { MultiRouteResult, WalkingMode } from "@/lib/routing/types";
import type { GeoPos } from "@/hooks/use-geolocation";
import type { CampusLocation } from "@/lib/api-client";
import { getCampusLocations } from "@/lib/campus/seed";
import { loadStreak, updateStreak, type StreakData } from "@/lib/campus/streak";
import {
  loadBadges,
  saveBadges,
  evaluateBadges,
  type UnlockedBadges,
  type BadgeEvalContext,
} from "@/lib/campus/badges";

/**
 * Global app store for the IITGN Walk app. Holds planner selections, the
 * computed routes, and the active journey + GPS trace buffer.
 */

export interface Bookmark {
  from: string;
  to: string;
  mode: WalkingMode;
  label: string;
}

interface AppState {
  // campus data
  locations: CampusLocation[];
  setLocations: (l: CampusLocation[]) => void;

  // planner
  fromSlug: string | null;
  toSlug: string | null;
  fromPos: GeoPos | null; // when "current location"
  useGpsOrigin: boolean;
  mode: WalkingMode;
  accessibleOnly: boolean;
  setFrom: (slug: string | null) => void;
  setTo: (slug: string | null) => void;
  setFromPos: (p: GeoPos | null) => void;
  setUseGpsOrigin: (b: boolean) => void;
  setMode: (m: WalkingMode) => void;
  setAccessibleOnly: (b: boolean) => void;
  swapFromTo: () => void;

  // route customisation (advanced options)
  avoidShaded: boolean;
  preferSheltered: boolean;
  avoidCrowds: boolean;
  /** Ordered list of via-point location slugs (waypoints), max 3. */
  viaPoints: string[];
  setAvoidShaded: (b: boolean) => void;
  setPreferSheltered: (b: boolean) => void;
  setAvoidCrowds: (b: boolean) => void;
  /** Replace the entire via-points array (clamped to 3 entries). */
  setViaPoints: (slugs: string[]) => void;
  /** Append a fresh (empty) waypoint slot if there's room (max 3). */
  addViaPoint: () => void;
  /** Update the waypoint at `index` to `slug` (no-op if out of range). */
  updateViaPoint: (index: number, slug: string) => void;
  /** Remove the waypoint at `index` and shift subsequent entries up. */
  removeViaPoint: (index: number) => void;
  /** Clear all waypoints. */
  clearViaPoints: () => void;

  // routes
  routes: MultiRouteResult | null;
  routesLoading: boolean;
  routesError: string | null;
  selectedObjective: "FASTEST" | "SHORTEST" | "EASIEST" | "ALTERNATIVE";
  setRoutes: (r: MultiRouteResult | null) => void;
  setRoutesLoading: (b: boolean) => void;
  setRoutesError: (s: string | null) => void;
  setSelectedObjective: (o: AppState["selectedObjective"]) => void;

  // active journey
  journeyId: string | null;
  setJourneyId: (id: string | null) => void;
  predictedS: number | null;
  setPredictedS: (s: number | null) => void;
  gpsTrace: GeoPos[];
  pushGps: (p: GeoPos) => void;
  clearGps: () => void;
  startedAt: number | null;
  setStartedAt: (t: number | null) => void;

  // bookmarks
  bookmarks: Bookmark[];
  setBookmarks: (b: Bookmark[]) => void;
  addBookmark: (b: Bookmark) => void;
  removeBookmark: (from: string, to: string) => void;
  isBookmarked: (from: string, to: string) => boolean;

  // favorites (starred individual locations — distinct from bookmarks
  // which are saved from→to route pairs)
  favorites: string[];
  /** Toggle a location slug in/out of favorites. Slugs are validated against
   *  `getCampusLocations()`; invalid slugs are silently ignored. */
  toggleFavorite: (slug: string) => void;
  /** Selector helper: returns `true` if `slug` is in the favorites list. */
  isFavorite: (slug: string) => boolean;
  /** Empty the favorites list entirely. */
  clearFavorites: () => void;

  // personal walking pace (m/s) — used by the Walking Buddy pace-matcher.
  // Persists to localStorage["iitgn-personal-pace"] across sessions.
  personalPace: number;
  /** Update the personal pace (clamped to a safe 0.4–2.0 m/s range). */
  setPersonalPace: (v: number) => void;

  // walking streak — daily consecutive-day streak counter.
  // Persists to localStorage["iitgn-streak"] across sessions.
  streak: StreakData;
  /** Refresh the streak (call when a journey is COMPLETED). */
  refreshStreak: () => void;

  // achievement badges — collectible milestone unlocks.
  // Persists to localStorage["iitgn-badges"] across sessions.
  badges: UnlockedBadges;
  /**
   * Evaluate the badge context against all 10 collectible badges and unlock
   * any newly-satisfied ones. Persists to localStorage and returns the array
   * of newly-unlocked badge ids (so the caller can fire celebratory toasts).
   * Idempotent: repeated calls with the same context unlock nothing new.
   */
  unlockBadges: (ctx: BadgeEvalContext) => string[];
}

function loadBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("iitgn-bookmarks");
    if (raw) return JSON.parse(raw) as Bookmark[];
  } catch { /* ignore */ }
  return [];
}

function saveBookmarks(b: Bookmark[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("iitgn-bookmarks", JSON.stringify(b));
  } catch { /* ignore */ }
}

/* ── Favorites (starred locations) localStorage helpers ── */
const FAV_KEY = "iitgn-favorites";

/** Cached Set of valid campus-location slugs (built once per call to avoid
 *  re-allocating on every toggle). Falls back to an empty Set if seed data
 *  is somehow unavailable. */
function getValidSlugs(): Set<string> {
  try {
    return new Set(getCampusLocations().map((l) => l.slug));
  } catch {
    return new Set();
  }
}

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate slugs at load time too — silently drop stale entries (e.g.
    // if a campus seed rename ever lands between sessions).
    const valid = getValidSlugs();
    return parsed.filter(
      (s): s is string => typeof s === "string" && valid.has(s),
    );
  } catch { /* ignore */ }
  return [];
}

function saveFavorites(f: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(f));
  } catch { /* ignore */ }
}

/* ── Personal walking pace localStorage helpers ── */
const PACE_KEY = "iitgn-personal-pace";

/** Default pace (m/s) — Comfortable. */
const DEFAULT_PERSONAL_PACE = 1.0;

/** Clamp a personal pace value into the safe 0.4–2.0 m/s band. */
function clampPace(v: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_PERSONAL_PACE;
  return Math.min(2.0, Math.max(0.4, n));
}

function loadPersonalPace(): number {
  if (typeof window === "undefined") return DEFAULT_PERSONAL_PACE;
  try {
    const raw = localStorage.getItem(PACE_KEY);
    if (raw == null) return DEFAULT_PERSONAL_PACE;
    const parsed = Number(JSON.parse(raw));
    return clampPace(parsed);
  } catch { /* ignore */ }
  return DEFAULT_PERSONAL_PACE;
}

function savePersonalPace(v: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PACE_KEY, JSON.stringify(v));
  } catch { /* ignore */ }
}

export const useAppStore = create<AppState>((set, get) => ({
  locations: [],
  setLocations: (l) => set({ locations: l }),

  fromSlug: null,
  toSlug: null,
  fromPos: null,
  useGpsOrigin: false,
  mode: "NORMAL",
  accessibleOnly: false,
  avoidShaded: false,
  preferSheltered: false,
  avoidCrowds: false,
  viaPoints: [],
  setFrom: (slug) => set({ fromSlug: slug }),
  setTo: (slug) => set({ toSlug: slug }),
  setFromPos: (p) => set({ fromPos: p }),
  setUseGpsOrigin: (b) => set({ useGpsOrigin: b }),
  setMode: (m) => set({ mode: m }),
  setAccessibleOnly: (b) => set({ accessibleOnly: b }),
  setAvoidShaded: (b) => set({ avoidShaded: b }),
  setPreferSheltered: (b) => set({ preferSheltered: b }),
  setAvoidCrowds: (b) => set({ avoidCrowds: b }),
  setViaPoints: (slugs) => set({ viaPoints: slugs.slice(0, 3) }),
  addViaPoint: () =>
    set((st) =>
      st.viaPoints.length >= 3
        ? st
        : { viaPoints: [...st.viaPoints, ""] },
    ),
  updateViaPoint: (index, slug) =>
    set((st) => {
      if (index < 0 || index >= st.viaPoints.length) return st;
      const next = st.viaPoints.slice();
      next[index] = slug;
      return { viaPoints: next };
    }),
  removeViaPoint: (index) =>
    set((st) => {
      if (index < 0 || index >= st.viaPoints.length) return st;
      return { viaPoints: st.viaPoints.filter((_, i) => i !== index) };
    }),
  clearViaPoints: () => set({ viaPoints: [] }),
  swapFromTo: () =>
    set((st) => {
      // If GPS was on for From, turn it off and set From to the current To slug
      const newFrom = st.useGpsOrigin ? st.toSlug : st.toSlug;
      return {
        fromSlug: newFrom,
        toSlug: st.fromSlug,
        useGpsOrigin: false,
      };
    }),

  routes: null,
  routesLoading: false,
  routesError: null,
  selectedObjective: "FASTEST",
  setRoutes: (r) => set({ routes: r }),
  setRoutesLoading: (b) => set({ routesLoading: b }),
  setRoutesError: (s) => set({ routesError: s }),
  setSelectedObjective: (o) => set({ selectedObjective: o }),

  journeyId: null,
  setJourneyId: (id) => set({ journeyId: id }),
  predictedS: null,
  setPredictedS: (s) => set({ predictedS: s }),
  gpsTrace: [],
  pushGps: (p) =>
    set((st) => ({
      gpsTrace:
        st.gpsTrace.length === 0 ||
        st.gpsTrace[st.gpsTrace.length - 1].ts !== p.ts
          ? [...st.gpsTrace, p]
          : st.gpsTrace,
    })),
  clearGps: () => set({ gpsTrace: [] }),
  startedAt: null,
  setStartedAt: (t) => set({ startedAt: t }),

  bookmarks: loadBookmarks(),
  setBookmarks: (b) => { saveBookmarks(b); set({ bookmarks: b }); },
  addBookmark: (b) => {
    const cur = get().bookmarks;
    if (cur.some((x) => x.from === b.from && x.to === b.to)) return;
    const next = [...cur, b];
    saveBookmarks(next);
    set({ bookmarks: next });
  },
  removeBookmark: (from, to) => {
    const next = get().bookmarks.filter((x) => !(x.from === from && x.to === to));
    saveBookmarks(next);
    set({ bookmarks: next });
  },
  isBookmarked: (from, to) => get().bookmarks.some((x) => x.from === from && x.to === to),

  favorites: loadFavorites(),
  toggleFavorite: (slug) => {
    const valid = getValidSlugs();
    if (!valid.has(slug)) return; // silently ignore invalid slugs
    const cur = get().favorites;
    const next = cur.includes(slug)
      ? cur.filter((s) => s !== slug)
      : [...cur, slug];
    saveFavorites(next);
    set({ favorites: next });
  },
  isFavorite: (slug) => get().favorites.includes(slug),
  clearFavorites: () => {
    saveFavorites([]);
    set({ favorites: [] });
  },

  personalPace: loadPersonalPace(),
  setPersonalPace: (v) => {
    const clamped = Math.min(2.0, Math.max(0.4, v));
    savePersonalPace(clamped);
    set({ personalPace: clamped });
  },

  streak: loadStreak(),
  refreshStreak: () => {
    const updated = updateStreak();
    set({ streak: updated });
  },

  badges: loadBadges(),
  unlockBadges: (ctx) => {
    const newlyUnlocked = evaluateBadges(ctx);
    if (newlyUnlocked.length === 0) return [];
    const cur = get().badges;
    const ts = new Date().toISOString();
    const next: UnlockedBadges = { ...cur };
    for (const id of newlyUnlocked) {
      next[id] = { unlockedAt: ts };
    }
    saveBadges(next);
    set({ badges: next });
    return newlyUnlocked;
  },
}));
