import { NextResponse } from "next/server";
import { CAMPUS_BOUNDS, SEED_LOCATIONS, toLatLng } from "@/lib/campus/seed";

// ── Types ──

export interface ActiveWalker {
  id: string;
  lat: number;
  lng: number;
  speedMps: number;
  mode: "RELAXED" | "NORMAL" | "HURRY";
  heading: number; // 0-360 degrees
  lastUpdated: string; // ISO timestamp
}

export interface HeatCell {
  row: number;
  col: number;
  centerLat: number;
  centerLng: number;
  count: number;
  avgSpeed: number;
}

export interface CampusActivityResponse {
  walkers: ActiveWalker[];
  heatmap: HeatCell[];
  totalWalkers: number;
  timestamp: string;
  timeContext: "morning" | "class_hours" | "lunch" | "evening" | "night";
}

// ── Seeded random for consistency within a 30s window ──
function seededRandom(seed: number): () => number {
  let s = Math.abs(seed) | 1; // ensure non-zero
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Time context ──
function getTimeContext(hour: number): CampusActivityResponse["timeContext"] {
  if (hour >= 5 && hour < 9) return "morning";
  if (hour >= 9 && hour < 12) return "class_hours";
  if (hour >= 12 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 18) return "class_hours";
  if (hour >= 18 && hour < 21) return "evening";
  return "night";
}

// ── Generate walkers based on time of day ──
function generateWalkers(
  timeContext: CampusActivityResponse["timeContext"],
  now: Date,
): ActiveWalker[] {
  // Use minute-level seed so walkers shift every minute but stay stable within it
  const minuteSeed = Math.floor(now.getTime() / 60000);
  const rand = seededRandom(minuteSeed);

  // Select anchor locations based on time context
  const anchors: { lat: number; lng: number; weight: number }[] = [];

  for (const loc of SEED_LOCATIONS) {
    const pos = toLatLng(loc.east, loc.north);
    let weight = 0.3;
    switch (timeContext) {
      case "morning":
        if (loc.category === "HOSTEL") weight = 1.0;
        else if (loc.category === "DINING") weight = 0.8;
        else if (loc.category === "GATE") weight = 0.5;
        break;
      case "class_hours":
        if (loc.category === "ACADEMIC" || loc.category === "CLASSROOM" || loc.category === "LAB") weight = 1.0;
        else if (loc.category === "LIBRARY") weight = 0.7;
        else if (loc.category === "HOSTEL") weight = 0.3;
        break;
      case "lunch":
        if (loc.category === "DINING") weight = 1.0;
        else if (loc.category === "HOSTEL") weight = 0.6;
        else if (loc.category === "ACADEMIC" || loc.category === "CLASSROOM") weight = 0.5;
        break;
      case "evening":
        if (loc.category === "SPORTS") weight = 1.0;
        else if (loc.category === "LANDMARK") weight = 0.8;
        else if (loc.category === "DINING") weight = 0.7;
        break;
      case "night":
        if (loc.category === "HOSTEL") weight = 0.7;
        else if (loc.category === "LIBRARY") weight = 0.5;
        else weight = 0.1;
        break;
    }
    anchors.push({ lat: pos.lat, lng: pos.lng, weight });
  }

  // Total walkers: 15-20, fewer at night
  const totalTarget = timeContext === "night" ? 8 : 15 + Math.floor(rand() * 6);
  const walkers: ActiveWalker[] = [];

  for (let i = 0; i < totalTarget; i++) {
    // Weighted random anchor selection
    const totalWeight = anchors.reduce((s, a) => s + a.weight, 0);
    let r = rand() * totalWeight;
    let anchor = anchors[0];
    for (const a of anchors) {
      r -= a.weight;
      if (r <= 0) { anchor = a; break; }
    }

    // Scatter around anchor (within ~100-200m radius)
    const scatter = 0.001 + rand() * 0.001;
    const lat = anchor.lat + (rand() - 0.5) * scatter;
    const lng = anchor.lng + (rand() - 0.5) * scatter;

    const modeRoll = rand();
    const mode: ActiveWalker["mode"] =
      modeRoll < 0.3 ? "RELAXED" : modeRoll < 0.8 ? "NORMAL" : "HURRY";
    const speedMps =
      mode === "RELAXED" ? 0.8 + rand() * 0.4 :
      mode === "NORMAL" ? 1.2 + rand() * 0.3 :
      1.6 + rand() * 0.5;

    const heading = Math.floor(rand() * 360);

    walkers.push({
      id: `walker-${i + 1}`,
      lat,
      lng,
      speedMps: Math.round(speedMps * 100) / 100,
      mode,
      heading,
      lastUpdated: now.toISOString(),
    });
  }

  return walkers;
}

// ── Generate heatmap grid (8×6) ──
function generateHeatmap(walkers: ActiveWalker[]): HeatCell[] {
  const sw = CAMPUS_BOUNDS.sw;
  const ne = CAMPUS_BOUNDS.ne;
  const rows = 6;
  const cols = 8;
  const latStep = (ne.lat - sw.lat) / rows;
  const lngStep = (ne.lng - sw.lng) / cols;

  const cells: HeatCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const centerLat = sw.lat + (r + 0.5) * latStep;
      const centerLng = sw.lng + (c + 0.5) * lngStep;
      cells.push({ row: r, col: c, centerLat, centerLng, count: 0, avgSpeed: 0 });
    }
  }

  // Assign walkers to cells
  for (const w of walkers) {
    const r = Math.floor((w.lat - sw.lat) / latStep);
    const c = Math.floor((w.lng - sw.lng) / lngStep);
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      const cell = cells[r * cols + c];
      cell.count++;
      cell.avgSpeed = (cell.avgSpeed * (cell.count - 1) + w.speedMps) / cell.count;
    }
  }

  return cells;
}

export async function GET() {
  const now = new Date();
  const hour = now.getHours();
  const timeContext = getTimeContext(hour);
  const walkers = generateWalkers(timeContext, now);
  const heatmap = generateHeatmap(walkers);

  const response: CampusActivityResponse = {
    walkers,
    heatmap,
    totalWalkers: walkers.length,
    timestamp: now.toISOString(),
    timeContext,
  };

  return NextResponse.json(response);
}
