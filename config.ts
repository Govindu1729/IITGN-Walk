// Centralized configuration constants for the IITGN Walk application.
// Extracted from scattered hard-coded values to improve maintainability
// and enable easy customization for different campus deployments.

/**
 * Routing Configuration
 */
export const ROUTING_CONFIG = {
  /** Maximum walking speed in m/s for admissible heuristic (hurry mode + path following) */
  MAX_WALK_SPEED: 2.2,

  /** Default walking speeds for different modes (m/s) */
  WALKING_SPEEDS: {
    leisure: 1.0,
    normal: 1.4,
    hurry: 2.0,
  },

  /** Maximum slope gradient considered safe for accessibility (degrees) */
  MAX_ACCESSIBLE_SLOPE: 5,

  /** Penalty multiplier for paths exceeding accessible slope */
  SLOPE_PENALTY_MULTIPLIER: 3.0,
} as const;

/**
 * Campus Geographic Bounds (IIT Gandhinagar)
 * Used for coordinate validation and map centering
 */
export const CAMPUS_BOUNDS = {
  /** Campus center coordinates */
  CENTER: { lat: 23.214167, lng: 72.608333 },

  /** Approximate bounding box for coordinate validation */
  BOUNDS: {
    north: 23.220,
    south: 23.208,
    east: 72.615,
    west: 72.600,
  },

  /** Campus area approximation in square meters */
  AREA_SQ_M: 400000, // ~40 hectares
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  /** Graph cache TTL in milliseconds (5 minutes) */
  GRAPH_CACHE_TTL_MS: 5 * 60 * 1000,

  /** Maximum number of cached routes */
  MAX_ROUTE_CACHE_SIZE: 100,

  /** Route cache TTL in milliseconds (2 minutes) */
  ROUTE_CACHE_TTL_MS: 2 * 60 * 1000,
} as const;

/**
 * API Rate Limiting
 */
export const RATE_LIMIT_CONFIG = {
  /** Maximum requests per minute per IP */
  MAX_REQUESTS_PER_MIN: 30,

  /** Maximum GPS trace submissions per hour per user */
  MAX_GPS_TRACES_PER_HOUR: 10,
} as const;

/**
 * Map Configuration
 */
export const MAP_CONFIG = {
  /** Default zoom level for campus view */
  DEFAULT_ZOOM: 15,

  /** Minimum zoom level */
  MIN_ZOOM: 12,

  /** Maximum zoom level */
  MAX_ZOOM: 19,

  /** Map style URL (MapLibre format) */
  STYLE_URL: '/map/style.json',
} as const;

/**
 * User Journey Configuration
 */
export const JOURNEY_CONFIG = {
  /** Minimum journey duration to record (seconds) */
  MIN_JOURNEY_DURATION_SEC: 30,

  /** GPS accuracy threshold for valid tracking (meters) */
  MAX_GPS_ACCURACY_M: 20,

  /** Time threshold to consider journey paused (seconds) */
  PAUSE_THRESHOLD_SEC: 120,
} as const;
