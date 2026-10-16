// GET /api/routes/share/:id
// Returns a previously shared route result by public ID.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiNotFound, apiServerError } from "@/lib/api-error";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const shared = await db.sharedRoute.findUnique({
      where: { id },
    });

    if (!shared) {
      return apiNotFound("Shared route not found", "ROUTE_NOT_FOUND");
    }

    if (shared.expiresAt && new Date(shared.expiresAt) < new Date()) {
      return apiNotFound("Shared route has expired", "ROUTE_EXPIRED");
    }

    return NextResponse.json({
      shareId: shared.id,
      routeResult: shared.routeResult,
      fromLocation: shared.fromLocation,
      toLocation: shared.toLocation,
      mode: shared.mode,
      createdAt: shared.createdAt,
      expiresAt: shared.expiresAt,
    });
  } catch (err) {
    return apiServerError("Failed to load shared route", "ROUTE_LOAD_FAILED", err);
  }
}
