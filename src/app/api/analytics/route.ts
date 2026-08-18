// GET /api/analytics
// Aggregated dashboard data: most-used routes, avg travel times by mode,
// predicted vs actual, route popularity, route reliability, GPS trace count.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/campus/loader";
import { DEFAULT_SPEED_MPS, type WalkingMode } from "@/lib/routing/types";

export async function GET() {
  await ensureSeeded();

  const completed = await db.journey.findMany({
    where: { status: "COMPLETED", actualS: { gt: 0 }, actualM: { gt: 0 } },
  });

  const total = completed.length;

  // Average travel time & speed by mode
  const byMode: Record<
    string,
    { count: number; sumTime: number; sumDist: number; sumPred: number }
  > = {
    RELAXED: { count: 0, sumTime: 0, sumDist: 0, sumPred: 0 },
    NORMAL: { count: 0, sumTime: 0, sumDist: 0, sumPred: 0 },
    HURRY: { count: 0, sumTime: 0, sumDist: 0, sumPred: 0 },
  };
  for (const j of completed) {
    const m = j.mode as WalkingMode;
    if (!byMode[m]) continue;
    byMode[m].count += 1;
    byMode[m].sumTime += j.actualS ?? 0;
    byMode[m].sumDist += j.actualM ?? 0;
    byMode[m].sumPred += j.predictedS ?? 0;
  }
  const modeStats = (Object.keys(byMode) as WalkingMode[]).map((m) => {
    const b = byMode[m];
    return {
      mode: m,
      count: b.count,
      avgTimeMin: b.count ? b.sumTime / b.count / 60 : 0,
      avgDistKm: b.count ? b.sumDist / b.count / 1000 : 0,
      avgSpeedMps: b.sumTime ? b.sumDist / b.sumTime : 0,
      defaultSpeedMps: DEFAULT_SPEED_MPS[m],
      avgPredictedMin: b.count ? b.sumPred / b.count / 60 : 0,
      predictionErrorPct:
        b.count && b.sumPred
          ? ((b.sumTime / b.count - b.sumPred / b.count) / (b.sumPred / b.count)) * 100
          : 0,
    };
  });

  // Most-used routes (by from+to pair)
  const routeCount = new Map<string, { count: number; sumTime: number; sumDist: number }>();
  for (const j of completed) {
    if (!j.fromLocation || !j.toLocation) continue;
    const key = `${j.fromLocation}→${j.toLocation}`;
    const e = routeCount.get(key) ?? { count: 0, sumTime: 0, sumDist: 0 };
    e.count += 1;
    e.sumTime += j.actualS ?? 0;
    e.sumDist += j.actualM ?? 0;
    routeCount.set(key, e);
  }
  const popularRoutes = Array.from(routeCount.entries())
    .map(([k, v]) => ({
      route: k,
      count: v.count,
      avgTimeMin: v.sumTime / v.count / 60,
      avgDistKm: v.sumDist / v.count / 1000,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Hostel <-> Academic breakdown
  const locations = await db.location.findMany();
  const cat = new Map(locations.map((l) => [l.slug, l.category]));
  const directionStats = { hostelToAcademic: 0, academicToHostel: 0, other: 0 };
  for (const j of completed) {
    const fromCat = j.fromLocation ? cat.get(j.fromLocation) : undefined;
    const toCat = j.toLocation ? cat.get(j.toLocation) : undefined;
    if (fromCat === "HOSTEL" && toCat === "ACADEMIC") directionStats.hostelToAcademic++;
    else if (fromCat === "ACADEMIC" && toCat === "HOSTEL") directionStats.academicToHostel++;
    else directionStats.other++;
  }

  // Route reliability: stddev of actual times for the most popular route
  let reliability: { route: string; stddevMin: number; n: number } | null = null;
  for (const [k, v] of routeCount.entries()) {
    if (v.count >= 2) {
      const times = completed
        .filter(
          (j) =>
            j.fromLocation &&
            j.toLocation &&
            `${j.fromLocation}→${j.toLocation}` === k,
        )
        .map((j) => (j.actualS ?? 0) / 60);
      const mean = times.reduce((s, t) => s + t, 0) / times.length;
      const variance =
        times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length;
      reliability = { route: k, stddevMin: Math.sqrt(variance), n: v.count };
      break;
    }
  }

  // GPS trace count
  const gpsCount = await db.gpsPoint.count();

  return NextResponse.json({
    totalJourneys: total,
    modeStats,
    popularRoutes,
    directionStats,
    reliability,
    gpsTraces: gpsCount,
  });
}
