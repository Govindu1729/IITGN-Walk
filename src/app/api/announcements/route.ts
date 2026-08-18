// GET /api/announcements
//
// Returns simulated campus announcements. In production these would be pulled
// from a CMS or admin tool; here we synthesise them so the UI is end-to-end.
//
// Filtering: pass ?active=true to return only announcements that have not yet
// expired (expiresAt > now).

import { NextResponse } from "next/server";

export type AnnouncementCategory =
  | "EVENT"
  | "MAINTENANCE"
  | "WEATHER"
  | "ACADEMIC";

export type AnnouncementPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  /** ISO time string. */
  postedAt: string;
  /** ISO time string — announcement is hidden after this. */
  expiresAt: string;
}

/* ── Sample announcements ───────────────────────────────────────────── */

const NOW = Date.now();
const H = 3600 * 1000;
const D = 24 * H;

function iso(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString();
}

const SAMPLE: Announcement[] = [
  {
    id: "ann-monsoon",
    title: "Monsoon Advisory: Carry umbrellas",
    body: "Heavy rainfall is forecast across Gandhinagar over the next 48 hours. Students are advised to carry umbrellas and use well-lit sheltered paths where possible. The Library↔LHC stretch is partially flooded — allow extra time.",
    category: "WEATHER",
    priority: "HIGH",
    postedAt: iso(-2 * H),
    expiresAt: iso(2 * D),
  },
  {
    id: "ann-midsem",
    title: "Mid-semester exam schedule released",
    body: "The mid-semester examination timetable has been posted on the academic portal. Exams begin next Monday. LHC will operate in exam mode (extended hours, no food in corridors) from Saturday onwards.",
    category: "ACADEMIC",
    priority: "MEDIUM",
    postedAt: iso(-5 * H),
    expiresAt: iso(10 * D),
  },
  {
    id: "ann-path-maint",
    title: "Path maintenance near AB2",
    body: "The pedestrian path on the south side of Academic Block 2 will be closed for resurfacing from 9am to 5pm today. Please use the alternate route via AB1 courtyard.",
    category: "MAINTENANCE",
    priority: "LOW",
    postedAt: iso(-1 * H),
    expiresAt: iso(8 * H),
  },
  {
    id: "ann-culfest",
    title: "Cultural fest registration open",
    body: "Registrations for the annual cultural fest are now live on the student portal. Walk-in registrations at the amphitheatre help desk between 4pm and 7pm. Volunteers will guide you from the Main Gate.",
    category: "EVENT",
    priority: "MEDIUM",
    postedAt: iso(-12 * H),
    expiresAt: iso(5 * D),
  },
  {
    id: "ann-library-hours",
    title: "Library extended hours during exams",
    body: "The Library & Learning Resource Centre will remain open until 2am during the mid-semester exam week. The 24-hour reading room on the ground floor has additional seating available on a first-come basis.",
    category: "ACADEMIC",
    priority: "LOW",
    postedAt: iso(-18 * H),
    expiresAt: iso(7 * D),
  },
  {
    id: "ann-sports-day",
    title: "Sports day registration",
    body: "Annual Sports Day is around the corner! On-the-spot registrations at the Sports Complex office. The Football / Cricket Ground walk from Hostel 1 takes ~5 min — please arrive 30 minutes before your event.",
    category: "EVENT",
    priority: "HIGH",
    postedAt: iso(-3 * H),
    expiresAt: iso(3 * D),
  },
];

/* ── Handler ─────────────────────────────────────────────────────────── */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "true";
  const now = Date.now();
  const items = activeOnly
    ? SAMPLE.filter((a) => new Date(a.expiresAt).getTime() > now)
    : SAMPLE;
  // Sort by priority (HIGH first) then by recency
  const orderRank: Record<AnnouncementPriority, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };
  items.sort((a, b) => {
    const pr = orderRank[a.priority] - orderRank[b.priority];
    if (pr !== 0) return pr;
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
  });
  return NextResponse.json({ announcements: items });
}
