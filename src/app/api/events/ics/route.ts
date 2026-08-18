/**
 * GET /api/events/ics
 *
 * Generates and returns an .ics (iCalendar) file for a single event.
 * Query params: title, start, end, venue, organizer
 *
 * The response is served as `text/calendar` with a Content-Disposition
 * header so the browser triggers a file download.
 */
import { NextRequest, NextResponse } from "next/server";
import { generateIcs } from "@/lib/campus/ics";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const title = searchParams.get("title") ?? "Campus Event";
  const description = searchParams.get("description") ?? "";
  const startTime = searchParams.get("start") ?? new Date().toISOString();
  const endTime = searchParams.get("end") ?? new Date().toISOString();
  const venue = searchParams.get("venue") ?? "IIT Gandhinagar";
  const organizer = searchParams.get("organizer") ?? "IITGN";

  // Validate that start/end look like parseable dates.
  if (isNaN(new Date(startTime).getTime()) || isNaN(new Date(endTime).getTime())) {
    return NextResponse.json(
      { error: "Invalid start or end date" },
      { status: 400 },
    );
  }

  const ics = generateIcs({ title, description, startTime, endTime, venue, organizer });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="event.ics"',
    },
  });
}
