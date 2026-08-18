// GET /api/events
//
// Returns the campus events calendar. Sample data lives in
// `src/lib/campus/events.ts` (12+ realistic IITGN events anchored in Aug 2026).
//
// Query parameters (all optional, combinable):
//   ?category=CULTURAL|TECHNICAL|SPORTS|ACADEMIC|SOCIAL|WORKSHOP
//   ?status=upcoming|today|past|ongoing
//   ?featured=true          (limits to isFeatured === true)
//   ?limit=N                (caps the result count)
//
// Sort order:
//   - status=past  → start time DESC (most recent first)
//   - everything else → start time ASC (chronological)
//
// Response shape:
//   { events: CampusEvent[], total: number, filters: {category, status, featured, limit} }

import { NextResponse } from "next/server";
import {
  SAMPLE_EVENTS,
  type CampusEvent,
  type EventCategory,
  isEventOngoing,
  isEventToday,
  isEventPast,
  isEventUpcoming,
} from "@/lib/campus/events";

export type EventStatusFilter = "upcoming" | "today" | "past" | "ongoing";

export interface EventsListResponse {
  events: CampusEvent[];
  total: number;
  filters: {
    category?: EventCategory;
    status?: EventStatusFilter;
    featured?: boolean;
    limit?: number;
  };
}

const VALID_CATEGORIES: EventCategory[] = [
  "CULTURAL",
  "TECHNICAL",
  "SPORTS",
  "ACADEMIC",
  "SOCIAL",
  "WORKSHOP",
];

const VALID_STATUSES: EventStatusFilter[] = [
  "upcoming",
  "today",
  "past",
  "ongoing",
];

function parseCategory(raw: string | null): EventCategory | undefined {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  return VALID_CATEGORIES.includes(upper as EventCategory)
    ? (upper as EventCategory)
    : undefined;
}

function parseStatus(raw: string | null): EventStatusFilter | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  return VALID_STATUSES.includes(lower as EventStatusFilter)
    ? (lower as EventStatusFilter)
    : undefined;
}

function parseBoolean(raw: string | null): boolean | undefined {
  if (raw === null) return undefined;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = parseCategory(url.searchParams.get("category"));
  const status = parseStatus(url.searchParams.get("status"));
  const featured = parseBoolean(url.searchParams.get("featured"));
  const limitRaw = url.searchParams.get("limit");
  const limit =
    limitRaw !== null && /^\d+$/.test(limitRaw)
      ? Math.max(1, parseInt(limitRaw, 10))
      : undefined;

  // Apply filters in sequence.
  let items = [...SAMPLE_EVENTS];

  if (category) {
    items = items.filter((e) => e.category === category);
  }

  if (status === "upcoming") {
    items = items.filter(isEventUpcoming);
  } else if (status === "today") {
    items = items.filter(isEventToday);
  } else if (status === "past") {
    items = items.filter(isEventPast);
  } else if (status === "ongoing") {
    items = items.filter(isEventOngoing);
  }

  if (featured === true) {
    items = items.filter((e) => e.isFeatured);
  } else if (featured === false) {
    items = items.filter((e) => !e.isFeatured);
  }

  // Sort: past → start DESC, everything else → start ASC.
  const sortDesc = status === "past";
  items.sort((a, b) => {
    const ta = new Date(a.startTime).getTime();
    const tb = new Date(b.startTime).getTime();
    return sortDesc ? tb - ta : ta - tb;
  });

  // Apply limit AFTER sort so we keep the most relevant items.
  const truncated = typeof limit === "number" ? items.slice(0, limit) : items;

  const body: EventsListResponse = {
    events: truncated,
    total: truncated.length,
    filters: { category, status, featured, limit },
  };

  return NextResponse.json(body);
}
