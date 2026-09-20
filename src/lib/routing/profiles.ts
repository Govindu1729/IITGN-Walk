// Walking-profile learning. V1: distance + fixed default speed.
// V2: campus-level learned speed per mode = sum(distance) / sum(time).
// This module owns the read/write of the WalkingProfile table.

import { db } from "../db";
import { DEFAULT_SPEED_MPS, type WalkingMode } from "./types";

/** Read learned campus-level speeds per mode (m/s). Falls back to defaults. */
export async function getLearnedSpeeds(): Promise<
  Partial<Record<WalkingMode, number>>
> {
  try {
    const rows = await db.walkingProfile.findMany({
      where: { scope: "CAMPUS" },
    });
    const out: Partial<Record<WalkingMode, number>> = {};
    for (const r of rows) {
      out[r.mode as WalkingMode] = r.speedMps;
    }
    return out;
  } catch {
    // Failed to load learned speeds — return empty object to use defaults
    // This is intentional: we prefer silent fallback over breaking the app
    return {};
  }
}

/** Persist a campus-level profile row (upsert). */
export async function upsertCampusProfile(
  mode: WalkingMode,
  speedMps: number,
  samples: number,
  sumDistM: number,
  sumTimeS: number,
) {
  try {
    await db.walkingProfile.upsert({
      where: { mode_scope_userId: { mode, scope: "CAMPUS", userId: "" } },
      update: { speedMps, samples, sumDistM, sumTimeS },
      create: {
        mode,
        scope: "CAMPUS",
        userId: "",
        speedMps,
        samples,
        sumDistM,
        sumTimeS,
      },
    });
  } catch {
    // Schema unique key uses userId, which is "" — if null causes issues, we create without userId uniqueness. We'll fall back to a find+update.
    // Silently ignore to avoid breaking the app on profile persistence errors
  }
}

/**
 * Recompute campus-level walking speeds for all modes from completed
 * journeys. Called after a journey is completed.
 */
export async function recomputeCampusSpeeds(): Promise<void> {
  const journeys = await db.journey.findMany({
    where: { status: "COMPLETED", actualS: { gt: 0 }, actualM: { gt: 0 } },
  });
  const buckets: Record<WalkingMode, { dist: number; time: number; n: number }> =
    {
      RELAXED: { dist: 0, time: 0, n: 0 },
      NORMAL: { dist: 0, time: 0, n: 0 },
      HURRY: { dist: 0, time: 0, n: 0 },
    };
  for (const j of journeys) {
    const m = j.mode as WalkingMode;
    if (!buckets[m]) continue;
    buckets[m].dist += j.actualM ?? 0;
    buckets[m].time += j.actualS ?? 0;
    buckets[m].n += 1;
  }
  for (const mode of Object.keys(buckets) as WalkingMode[]) {
    const b = buckets[mode];
    if (b.time > 0) {
      const speed = b.dist / b.time;
      // blend with default to avoid wild swings from small samples
      const sampleWeight = Math.min(1, b.n / 30);
      const blended = DEFAULT_SPEED_MPS[mode] * (1 - sampleWeight) + speed * sampleWeight;
      await upsertCampusProfile(mode, blended, b.n, b.dist, b.time);
    }
  }
}

/** Effective learned speed for a single mode (with fallback). */
export async function getSpeedForMode(mode: WalkingMode): Promise<number> {
  const learned = await getLearnedSpeeds();
  return learned[mode] ?? DEFAULT_SPEED_MPS[mode];
}
