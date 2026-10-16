// GET /api/locations
// Returns the flat list of campus POIs for pickers/dropdowns.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/campus/loader";
import { haversine } from "@/lib/geo/geo";
import { CAMPUS_CENTER } from "@/lib/campus/seed";
import { apiServerError } from "@/lib/api-error";

export async function GET() {
  try {
    await ensureSeeded();
    const locs = await db.location.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({
      locations: locs.map((l) => ({
        slug: l.slug,
        name: l.name,
        category: l.category,
        lng: l.lng,
        lat: l.lat,
        entryNode: l.entryNode,
        notes: l.notes,
        distFromCenter: haversine({ lat: l.lat, lng: l.lng }, CAMPUS_CENTER),
      })),
    });
  } catch (err) {
    return apiServerError("Failed to load locations", "LOCATIONS_LOAD_FAILED", err);
  }
}
