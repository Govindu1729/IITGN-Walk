// Frontend API client + shared types for the IITGN Walk app.
// All fetches use relative paths (no absolute URLs) for the gateway proxy.

import type {
  MultiRouteResult,
  RouteResult,
  WalkingMode,
} from "./routing/types";

export interface CampusLocation {
  slug: string;
  name: string;
  category: string;
  lng: number;
  lat: number;
  entryNode?: string | null;
  notes?: string | null;
  distFromCenter?: number;
}

export interface CampusData {
  center: { lat: number; lng: number };
  bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } };
  buildings: GeoJSON.FeatureCollection;
  network: {
    nodes: GeoJSON.FeatureCollection;
    edges: GeoJSON.FeatureCollection;
  };
  locations: GeoJSON.FeatureCollection;
  locationList: CampusLocation[];
}

export interface JourneySummary {
  id: string;
  mode: string;
  fromLocation: string | null;
  toLocation: string | null;
  status: string;
  actualS: number | null;
  actualM: number | null;
  predictedS: number | null;
  startTs: string;
  endTs: string | null;
}

export interface AnalyticsData {
  totalJourneys: number;
  modeStats: Array<{
    mode: WalkingMode;
    count: number;
    avgTimeMin: number;
    avgDistKm: number;
    avgSpeedMps: number;
    defaultSpeedMps: number;
    avgPredictedMin: number;
    predictionErrorPct: number;
  }>;
  popularRoutes: Array<{
    route: string;
    count: number;
    avgTimeMin: number;
    avgDistKm: number;
  }>;
  directionStats: { hostelToAcademic: number; academicToHostel: number; other: number };
  reliability: { route: string; stddevMin: number; n: number } | null;
  gpsTraces: number;
}

export interface WeatherData {
  temperature: number;
  condition: "Sunny" | "Cloudy" | "Rainy" | "Hot";
  humidity: number;
  windSpeed: number;
  impactFactor: number;
  description: string;
  icon: string;
}

export interface WalkingProfile {
  mode: WalkingMode;
  speedMps: number;
  samples: number;
  sumDistM: number;
  sumTimeS: number;
  isLearned: boolean;
}

export type AnnouncementCategory =
  | "EVENT"
  | "MAINTENANCE"
  | "WEATHER"
  | "ACADEMIC";

export type AnnouncementPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  postedAt: string;
  expiresAt: string;
}

// ── Campus Activity types ──

export interface ActiveWalker {
  id: string;
  lat: number;
  lng: number;
  speedMps: number;
  mode: "RELAXED" | "NORMAL" | "HURRY";
  heading: number;
  lastUpdated: string;
}

export interface HeatCell {
  row: number;
  col: number;
  centerLat: number;
  centerLng: number;
  count: number;
  avgSpeed: number;
}

export interface CampusActivityData {
  walkers: ActiveWalker[];
  heatmap: HeatCell[];
  totalWalkers: number;
  timestamp: string;
  timeContext: "morning" | "class_hours" | "lunch" | "evening" | "night";
}

// ── Campus Events Calendar types ──

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
  startTime: string; // ISO
  endTime: string; // ISO
  venueSlug: string;
  organizer: string;
  tags: string[];
  capacity?: number;
  registeredCount?: number;
  isFeatured: boolean;
}

export type EventStatusFilter = "upcoming" | "today" | "past" | "ongoing";

// ── Indoor Floor Plan types (mirrors src/lib/campus/indoor-plans.ts) ──
// These are STATIC, bundled in the JS — no API endpoint exists for them.
// Re-exported here so downstream consumers import from a single module.

export type IndoorFeatureType =
  | "room"
  | "restroom-m"
  | "restroom-f"
  | "exit"
  | "stairs"
  | "elevator"
  | "corridor"
  | "classroom"
  | "lab"
  | "office"
  | "cafe"
  | "study-area";

export interface IndoorFeature {
  id: string;
  label: string;
  type: IndoorFeatureType;
  x: number;
  y: number;
  w: number;
  h: number;
  capacity?: number;
  notes?: string;
}

export interface IndoorLegendEntry {
  type: IndoorFeatureType;
  label: string;
  color: string;
}

export interface IndoorPlan {
  buildingSlug: string;
  buildingName: string;
  floorNumber: number;
  floorName: string;
  width: number;
  height: number;
  features: IndoorFeature[];
  legend?: IndoorLegendEntry[];
}

export interface EventsListParams {
  category?: EventCategory;
  status?: EventStatusFilter;
  featured?: boolean;
  limit?: number;
}

export interface EventsListResponse {
  events: CampusEvent[];
  total: number;
  filters: {
    category?: EventCategory;
    status?: EventStatusFilter;
    featured?: boolean;
    limit?: number;
  };
}

/**
 * Retry a fetch-like operation up to `maxRetries` times with exponential
 * backoff on **network-level** errors only (TypeError: Failed to fetch).
 * HTTP errors (4xx, 5xx) are NOT retried — they indicate a real problem.
 */
const RETRY_DELAYS_MS = [300, 600, 1200]; // exponential backoff

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Only retry on network-level TypeError (e.g. "Failed to fetch")
      const isNetworkError =
        err instanceof TypeError &&
        (err.message === "Failed to fetch" ||
          err.message.includes("fetch") ||
          err.message.includes("NetworkError") ||
          err.message.includes("Load failed"));
      if (!isNetworkError || attempt === RETRY_DELAYS_MS.length) {
        // Not a retriable error, or we've exhausted retries
        break;
      }
      // Wait with exponential backoff before next attempt
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw new Error(
    `${label} failed after ${RETRY_DELAYS_MS.length + 1} attempt(s): ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

async function jget<T>(url: string): Promise<T> {
  return withRetry(
    async () => {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`GET ${url} → ${r.status} ${r.statusText}`);
      return (await r.json()) as T;
    },
    `GET ${url}`,
  );
}

async function jpost<T>(url: string, body: unknown): Promise<T> {
  return withRetry(
    async () => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`POST ${url} → ${r.status} ${r.statusText}`);
      return (await r.json()) as T;
    },
    `POST ${url}`,
  );
}

async function jpatch<T>(url: string, body: unknown): Promise<T> {
  return withRetry(
    async () => {
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`PATCH ${url} → ${r.status} ${r.statusText}`);
      return (await r.json()) as T;
    },
    `PATCH ${url}`,
  );
}

export const api = {
  campus: () => jget<CampusData>("/api/campus"),
  locations: () => jget<{ locations: CampusLocation[] }>("/api/locations"),
  computeRoutes: (req: {
    from?: string;
    to?: string;
    fromCoord?: { lat: number; lng: number };
    toCoord?: { lat: number; lng: number };
    mode: WalkingMode;
    accessibleOnly?: boolean;
    /** Invert lighting preference (avoid shaded edges). */
    avoidShaded?: boolean;
    /** Boost edges with `lighting: "GOOD"` (well-lit / sheltered). */
    preferSheltered?: boolean;
    /** Boost edges with `trafficLevel: LOW`. */
    avoidCrowds?: boolean;
    /** Optional via-point location slug — single via (legacy). */
    viaPoint?: string;
    /** Ordered list of via-point location slugs (up to 3). */
    viaPoints?: string[];
    /** Optional custom walking speed (m/s) to override learned speed;
     *  0 or undefined = use learned campus speed. */
    customSpeedMps?: number;
  }) => jpost<MultiRouteResult>("/api/route-compute", req),
  startJourney: (req: {
    from?: string;
    to?: string;
    mode: WalkingMode;
    routeId?: string;
    predictedS?: number;
  }) => jpost<{ journeyId: string }>("/api/journeys", req),
  completeJourney: (
    id: string,
    req: {
      status: "COMPLETED" | "ABANDONED";
      actualS?: number;
      actualM?: number;
      gpsTrace?: Array<{
        lat: number;
        lng: number;
        accuracyM?: number;
        capturedTs: string;
        matched?: boolean;
        matchedNode?: string;
      }>;
    },
  ) => jpatch<{ journey: JourneySummary }>(`/api/journeys/${id}`, req),
  listJourneys: (status?: string) =>
    jget<{ journeys: JourneySummary[] }>(
      `/api/journeys${status ? `?status=${status}` : ""}`,
    ),
  analytics: () => jget<AnalyticsData>("/api/analytics"),
  profiles: () => jget<{ profiles: WalkingProfile[] }>("/api/profiles"),
  weather: () => jget<WeatherData>("/api/weather"),
  announcements: () =>
    jget<{ announcements: Announcement[] }>("/api/announcements?active=true"),
  campusActivity: () => jget<CampusActivityData>("/api/campus-activity"),
  events: (params?: EventsListParams) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.status) qs.set("status", params.status);
    if (typeof params?.featured === "boolean")
      qs.set("featured", String(params.featured));
    if (typeof params?.limit === "number")
      qs.set("limit", String(params.limit));
    const query = qs.toString();
    return jget<EventsListResponse>(
      `/api/events${query ? `?${query}` : ""}`,
    );
  },
};

export type { MultiRouteResult, RouteResult, WalkingMode };
