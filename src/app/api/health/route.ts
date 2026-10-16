// GET /api/health
// Health check endpoint for deployment monitoring and uptime probes.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "IITGN Walk",
    version: "0.2.1",
    timestamp: new Date().toISOString(),
  });
}
