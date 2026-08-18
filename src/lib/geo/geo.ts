// Geographic utilities — pure TS, no native/PostGIS dependency.
// Haversine, bearing, point-to-line distance, basic map-matching, etc.

import type { LatLng } from "../routing/types";

const R_EARTH = 6371000; // metres
const DEG2RAD = Math.PI / 180;

export function toRad(deg: number): number {
  return deg * DEG2RAD;
}

export function toDeg(rad: number): number {
  return rad / DEG2RAD;
}

/** Great-circle distance between two lat/lng points, in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R_EARTH * c;
}

/** Initial bearing from a -> b, in degrees [0,360). */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Distance from point p to the segment a-b, in metres. */
export function pointToSegmentM(p: LatLng, a: LatLng, b: LatLng): number {
  // project p onto a-b in equirectangular plane around mid-lat (good for <1km)
  const mid = { lat: (a.lat + b.lat) / 2 };
  const mPerLat = 111320;
  const mPerLng = 111320 * Math.cos(toRad(mid.lat));
  const px = p.lng * mPerLng;
  const py = p.lat * mPerLat;
  const ax = a.lng * mPerLng;
  const ay = a.lat * mPerLat;
  const bx = b.lng * mPerLng;
  const by = b.lat * mPerLat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Map-match a raw GPS point to the nearest edge in the graph, returning the
 * node slug of the nearer endpoint if within tolerance. Conservative: we only
 * snap when the point is clearly closer to the network than its raw position.
 */
export function mapMatchPoint(
  p: LatLng,
  edges: Array<{ fromNode: { lat: number; lng: number }; toNode: { lat: number; lng: number }; fromSlug: string; toSlug: string }>,
  toleranceM = 25,
): { matched: boolean; nodeSlug?: string; edgeIndex?: number; distM: number } {
  let best = Infinity;
  let bestIdx = -1;
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const d = pointToSegmentM(p, e.fromNode, e.toNode);
    if (d < best) {
      best = d;
      bestIdx = i;
    }
  }
  if (bestIdx === -1 || best > toleranceM) {
    return { matched: false, distM: best === Infinity ? Infinity : best };
  }
  const e = edges[bestIdx];
  // snap to the closer endpoint of the matched edge
  const dFrom = haversine(p, e.fromNode);
  const dTo = haversine(p, e.toNode);
  return {
    matched: true,
    edgeIndex: bestIdx,
    nodeSlug: dFrom <= dTo ? e.fromSlug : e.toSlug,
    distM: best,
  };
}

/** Douglas-Peucker simplification for a [lng,lat] polyline. */
export function simplifyPath(points: [number, number][], epsilon = 2): [number, number][] {
  if (points.length < 3) return points.slice();
  const sqEps = epsilon * epsilon;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = -1;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDistSq(points[i], points[s], points[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > sqEps) {
      keep[idx] = true;
      stack.push([s, idx]);
      stack.push([idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function perpDistSq(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a[0] + t * dx;
  const cy = a[1] + t * dy;
  return (p[0] - cx) ** 2 + (p[1] - cy) ** 2;
}

/** Total length of a [lng,lat] polyline in metres. */
export function pathLengthM(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(
      { lat: points[i - 1][1], lng: points[i - 1][0] },
      { lat: points[i][1], lng: points[i][0] },
    );
  }
  return total;
}

/** Format metres as a human string: "1.2 km" or "620 m". */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Format metres in imperial units: "0.8 mi" or "640 ft". (1m = 3.281 ft, 1km = 0.621 mi) */
export function formatDistanceImperial(m: number): string {
  const feet = m * 3.281;
  if (feet < 1000) return `${Math.round(feet)} ft`;
  const miles = m * 0.000621;
  return `${miles.toFixed(2)} mi`;
}

/** Format seconds as minutes: "14 min" or "1 min". */
export function formatDuration(s: number): string {
  const mins = Math.round(s / 60);
  if (mins < 1) return "<1 min";
  return `${mins} min`;
}

/** Format seconds as minutes for imperial (same numbers; minutes are universal). */
export function formatDurationImperial(s: number): string {
  return formatDuration(s);
}

/** Format distance according to the user's preferred units system. */
export function formatDistanceAuto(m: number, units: "METRIC" | "IMPERIAL"): string {
  return units === "IMPERIAL" ? formatDistanceImperial(m) : formatDistance(m);
}

/** Format an ETA ISO string -> "08:47 AM". */
export function formatEta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Convert m/s to a human km/h string. */
export function mpsToKmh(mps: number): string {
  return `${(mps * 3.6).toFixed(1)} km/h`;
}
