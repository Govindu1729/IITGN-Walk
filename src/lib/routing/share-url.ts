// URL deep-link schema + helpers for the IITGN Walk route planner.
//
// A planner state is serialised into the URL query string so that users can
// share routes with one click (or bookmark/refresh without losing their
// selections). The schema is intentionally minimal and forward-compatible:
//
//   ?from=<slug>                 start location slug
//   ?to=<slug>                   destination slug
//   ?mode=<RELAXED|NORMAL|HURRY> walking mode (uppercase to match the API)
//   ?via=<slug1,slug2,slug3>     comma-separated via-point slugs (optional)
//   ?accessibility=<true|false>  accessibility-only toggle (optional, default false)
//
// All slug values are URL-encoded on write and decoded on read. Invalid slugs
// (not present in the campus seed dataset) are silently dropped on parse so
// that stale or hand-edited links never crash the planner.

import { getCampusLocations } from "@/lib/campus/seed";
import type { WalkingMode } from "@/lib/routing/types";

/** Walking-mode union mirrored here so this module can be consumed without
 *  pulling in the full routing types bundle. */
const VALID_MODES: ReadonlySet<WalkingMode> = new Set([
  "RELAXED",
  "NORMAL",
  "HURRY",
]);

/**
 * The subset of planner state that can be round-tripped through the URL.
 * Every field is optional because a partial state (e.g. only `from` set) is
 * perfectly valid while the user is mid-selection.
 */
export interface ShareState {
  from?: string;
  to?: string;
  mode?: WalkingMode;
  via?: string[];
  accessible?: boolean;
}

/**
 * Build the URL query string (including the leading `?`) for a given planner
 * state. Returns an empty string when the state is empty so callers can pass
 * the result straight into `history.replaceState`.
 *
 * Empty/undefined fields are omitted entirely rather than serialised as
 * `?from=&to=…` — this keeps the URL clean and avoids accidentally clearing
 * values on round-trip.
 */
export function buildShareUrl(state: ShareState): string {
  const params = new URLSearchParams();

  if (state.from) {
    params.set("from", state.from);
  }
  if (state.to) {
    params.set("to", state.to);
  }
  if (state.mode && VALID_MODES.has(state.mode)) {
    params.set("mode", state.mode);
  }
  if (state.via && state.via.length > 0) {
    // Filter out empty placeholder slots before serialising.
    const cleaned = state.via.filter((s) => Boolean(s));
    if (cleaned.length > 0) {
      params.set("via", cleaned.join(","));
    }
  }
  if (state.accessible !== undefined && state.accessible !== false) {
    // Only emit when truthy — `false` is the default and would just add noise.
    params.set("accessibility", "true");
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Parse a URL search string (e.g. `window.location.search` or
 * `"?from=library&to=ab1&mode=NORMAL"`) into a partial {@link ShareState}.
 *
 * - Returns an empty object on parse failure (never throws).
 * - Decodes URI components defensively (malformed `%` sequences are skipped).
 * - Validates `from`/`to`/`via` slugs against the campus location seed — any
 *   slug that doesn't match a known location is silently dropped.
 * - Validates `mode` against the {@link WalkingMode} union.
 * - `accessibility` accepts `"true"` / `"1"` as truthy; anything else is
 *   treated as `false` and omitted from the result.
 */
export function parseShareUrl(search: string): Partial<ShareState> {
  if (!search) return {};

  // `URLSearchParams` tolerates a leading `?` (and even no `?`), so we can
  // pass `window.location.search` directly.
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return {};
  }

  const knownSlugs = new Set(getCampusLocations().map((l) => l.slug));

  const result: Partial<ShareState> = {};

  const fromRaw = params.get("from");
  if (fromRaw) {
    const decoded = safeDecode(fromRaw);
    if (decoded && knownSlugs.has(decoded)) {
      result.from = decoded;
    }
  }

  const toRaw = params.get("to");
  if (toRaw) {
    const decoded = safeDecode(toRaw);
    if (decoded && knownSlugs.has(decoded)) {
      result.to = decoded;
    }
  }

  const modeRaw = params.get("mode");
  if (modeRaw) {
    const decoded = safeDecode(modeRaw);
    if (decoded && VALID_MODES.has(decoded as WalkingMode)) {
      result.mode = decoded as WalkingMode;
    }
  }

  const viaRaw = params.get("via");
  if (viaRaw) {
    const decoded = safeDecode(viaRaw);
    if (decoded) {
      const slugs = decoded
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && knownSlugs.has(s));
      // De-duplicate while preserving order; cap at 3 (matches planner limit).
      const unique: string[] = [];
      for (const s of slugs) {
        if (!unique.includes(s)) unique.push(s);
        if (unique.length >= 3) break;
      }
      if (unique.length > 0) {
        result.via = unique;
      }
    }
  }

  const accRaw = params.get("accessibility");
  if (accRaw !== null) {
    const decoded = safeDecode(accRaw)?.toLowerCase();
    if (decoded === "true" || decoded === "1") {
      result.accessible = true;
    }
  }

  return result;
}

/**
 * Decode a URI component without throwing on malformed input (e.g. stray `%`
 * not followed by two hex digits). Returns the original string on failure.
 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
