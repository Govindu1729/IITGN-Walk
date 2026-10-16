// GET /api/profiles
// Returns the current walking-speed model (defaults + learned campus speeds).

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/campus/loader";
import { DEFAULT_SPEED_MPS, type WalkingMode } from "@/lib/routing/types";
import { apiServerError } from "@/lib/api-error";

export async function GET() {
  try {
    await ensureSeeded();
    const rows = await db.walkingProfile.findMany({
      where: { scope: "CAMPUS" },
    });
    const map = new Map(rows.map((r) => [r.mode, r]));
    const out = (Object.keys(DEFAULT_SPEED_MPS) as WalkingMode[]).map((m) => {
      const r = map.get(m);
      return {
        mode: m,
        speedMps: r?.speedMps ?? DEFAULT_SPEED_MPS[m],
        samples: r?.samples ?? 0,
        sumDistM: r?.sumDistM ?? 0,
        sumTimeS: r?.sumTimeS ?? 0,
        isLearned: (r?.samples ?? 0) > 0,
      };
    });
    return NextResponse.json({ profiles: out });
  } catch (err) {
    return apiServerError("Failed to load profiles", "PROFILES_LOAD_FAILED", err);
  }
}
