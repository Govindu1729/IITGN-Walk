"use client";

// Campus Events Calendar panel — list of upcoming / today / past events with
// category filters, capacity progress bars, status pills, and a "Navigate to
// event" button that pushes the venue slug into the route planner.
//
// Data is fetched from `/api/events` (see `src/app/api/events/route.ts`).
// Filter chips re-fetch with `?status=` / `?category=` query params.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  api,
  type CampusEvent,
  type CampusLocation,
  type EventCategory,
  type EventStatusFilter,
} from "@/lib/api-client";
import {
  EVENT_CATEGORY_META,
  getEventVenueName,
  isEventOngoing,
  isEventToday,
  isEventUpcoming,
} from "@/lib/campus/events";
import { DateBadge } from "./date-badge";
import {
  Sparkles,
  Cpu,
  Trophy,
  GraduationCap,
  Users,
  Wrench,
  Star,
  MapPin,
  Clock,
  Calendar,
  Navigation2,
  Filter,
  CalendarDays,
  CalendarPlus,
} from "lucide-react";

/* ── Icon map (mirrors `EVENT_CATEGORY_META[].icon`) ──────────────────── */

// Re-export the icon-name type so we don't need a separate import in callers.
type EventCategoryMeta = (typeof EVENT_CATEGORY_META)[EventCategory];

const CATEGORY_ICONS: Record<
  EventCategoryMeta["icon"],
  React.ComponentType<{ className?: string }>
> = {
  Sparkles,
  Cpu,
  Trophy,
  GraduationCap,
  Users,
  Wrench,
};

/* ── Filter chip metadata ──────────────────────────────────────────────── */

type StatusFilterValue = EventStatusFilter | "all";
type CategoryFilterValue = EventCategory | "all";

const STATUS_CHIPS: Array<{
  value: StatusFilterValue;
  label: string;
  className: string;
}> = [
  {
    value: "all",
    label: "All",
    className:
      "data-[active=true]:bg-teal-600 data-[active=true]:text-white data-[active=true]:border-teal-600",
  },
  {
    value: "today",
    label: "Today",
    className:
      "data-[active=true]:bg-emerald-600 data-[active=true]:text-white data-[active=true]:border-emerald-600",
  },
  {
    value: "upcoming",
    label: "Upcoming",
    className:
      "data-[active=true]:bg-teal-600 data-[active=true]:text-white data-[active=true]:border-teal-600",
  },
  {
    value: "past",
    label: "Past",
    className:
      "data-[active=true]:bg-slate-500 data-[active=true]:text-white data-[active=true]:border-slate-500",
  },
];

const CATEGORY_CHIPS: Array<{ value: CategoryFilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "CULTURAL", label: "Cultural" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "SPORTS", label: "Sports" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "SOCIAL", label: "Social" },
  { value: "WORKSHOP", label: "Workshop" },
];

/* ── Status pill renderer ─────────────────────────────────────────────── */

function StatusPill({ event }: { event: CampusEvent }) {
  const ongoing = isEventOngoing(event);
  const today = isEventToday(event);
  const upcoming = isEventUpcoming(event);

  let label = "Past";
  let cls =
    "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400";
  if (ongoing) {
    label = "Ongoing";
    cls =
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  } else if (today) {
    label = "Today";
    cls =
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  } else if (upcoming) {
    label = "Upcoming";
    cls = "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300";
  }

  return (
    <Badge
      className={cn(
        "gap-1 px-2 py-0 text-[10px] font-medium",
        ongoing && "animate-pulse",
        cls,
      )}
    >
      {ongoing && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-600" />
        </span>
      )}
      {label}
    </Badge>
  );
}

/* ── Date / time formatting ───────────────────────────────────────────── */

function formatEventDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  return `${fmt(s)} – ${fmt(e)}`;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/* ── Single event card ────────────────────────────────────────────────── */

interface EventCardProps {
  event: CampusEvent;
  onNavigate: (venueSlug: string) => void;
  /**
   * Optional — when provided, the entire card becomes clickable and clicking
   * it (anywhere except the "Navigate to event" button) fires this callback
   * with the venue's lat/lng so the parent can fly the map to the venue.
   */
  onEventVenueFocus?: (lat: number, lng: number, venueName: string) => void;
  /** Campus locations — used to resolve a venue slug → lat/lng for the focus callback. */
  locations?: CampusLocation[];
}

function EventCard({ event, onNavigate, onEventVenueFocus, locations }: EventCardProps) {
  const meta = EVENT_CATEGORY_META[event.category];
  const Icon = CATEGORY_ICONS[meta.icon];
  const venueName = getEventVenueName(event.venueSlug);
  const canNavigate = isEventToday(event) || isEventUpcoming(event);
  const showCapacity =
    typeof event.capacity === "number" &&
    typeof event.registeredCount === "number";
  const capPct = showCapacity
    ? Math.min(
        100,
        Math.round(
          ((event.registeredCount as number) / (event.capacity as number)) *
            100,
        ),
      )
    : 0;
  const isFull =
    showCapacity && (event.registeredCount as number) >= (event.capacity as number);

  // Resolve the venue's lat/lng from the campus locations list. If the slug
  // is unknown (or no locations prop was passed), focusShort is null and the
  // card click becomes a no-op for the focus callback.
  const venueLoc = locations?.find((l) => l.slug === event.venueSlug) ?? null;
  const canFocus = Boolean(onEventVenueFocus && venueLoc);

  const handleCardClick = useCallback(() => {
    if (!onEventVenueFocus || !venueLoc) return;
    onEventVenueFocus(venueLoc.lat, venueLoc.lng, venueName);
  }, [onEventVenueFocus, venueLoc, venueName]);

  return (
    <Card
      // Make the card clickable to "select" the event → fly map to its venue.
      // We attach the handler via a wrapping span when canFocus, so the
      // underlying <Card> semantics stay neutral when no handler is provided.
      onClick={canFocus ? handleCardClick : undefined}
      role={canFocus ? "button" : undefined}
      tabIndex={canFocus ? 0 : undefined}
      onKeyDown={
        canFocus
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCardClick();
              }
            }
          : undefined
      }
      className={cn(
        "hover-lift flex flex-col overflow-hidden p-0 border border-border/40 shadow-premium-1 transition-shadow duration-200 hover:shadow-premium-2",
        "border-l-4",
        event.isFeatured
          ? "border-l-amber-400 dark:border-l-amber-500"
          : "border-l-transparent",
        event.isFeatured &&
          "bg-gradient-to-br " + meta.gradient,
        canFocus &&
          "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 focus-visible:ring-offset-1",
      )}
    >
      {/* Top row: DateBadge + icon tile + title + featured star */}
      <div className="flex items-start gap-2.5 p-3 pb-2">
        {/* Calendar-style date indicator — leftmost element */}
        <DateBadge date={event.startTime} />
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            meta.iconTile,
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-2 text-sm font-semibold leading-tight">
              {event.title}
            </h4>
            {event.isFeatured && (
              <Star
                className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
                aria-label="Featured event"
              />
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <Badge
              variant="secondary"
              className={cn("px-1.5 py-0 text-[10px]", meta.badge)}
            >
              {meta.label}
            </Badge>
            <StatusPill event={event} />
          </div>
        </div>
      </div>

      {/* Meta info: date / time / venue / organizer */}
      <div className="flex flex-1 flex-col gap-1 px-3 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDayLabel(event.startTime)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeRange(event.startTime, event.endTime)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{venueName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">{event.organizer}</span>
        </div>
      </div>

      {/* Description */}
      <p className="mx-3 mt-2 line-clamp-2 text-[11px] leading-relaxed text-foreground/70">
        {event.description}
      </p>

      {/* Tags */}
      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          {event.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted/70 px-1.5 py-0 text-[9px] font-medium text-muted-foreground dark:bg-muted/40"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Capacity progress */}
      {showCapacity && (
        <div className="px-3 pt-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-2.5 w-2.5" />
              {isFull ? "Full" : "Registered"}
            </span>
            <span className="font-medium tabular-nums">
              {event.registeredCount} / {event.capacity}
            </span>
          </div>
          <Progress
            value={capPct}
            className={cn(
              "mt-1 h-1.5",
              isFull &&
                "[&>[data-slot=progress-indicator]]:bg-rose-500",
            )}
          />
        </div>
      )}

      {/* Navigate + Add-to-Calendar buttons — stopPropagation so they don't trigger card focus */}
      <div className="mt-auto flex items-center gap-1.5 p-3 pt-2">
        {canNavigate ? (
          <Button
            size="sm"
            className={cn(
              "flex-1 gap-1.5 text-xs",
              "bg-gradient-to-r from-teal-700 to-emerald-700 text-white hover:from-teal-800 hover:to-emerald-800",
              "dark:from-teal-600 dark:to-emerald-600",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(event.venueSlug);
            }}
          >
            <Navigation2 className="h-3.5 w-3.5" />
            Navigate to event
          </Button>
        ) : (
          <div className="flex flex-1 items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-[10px] text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            Event concluded
          </div>
        )}
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-teal-600 dark:hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40"
          aria-label="Add to calendar"
          title="Download .ics calendar file"
          onClick={(e) => {
            e.stopPropagation();
            const params = new URLSearchParams({
              title: event.title,
              description: event.description,
              start: event.startTime,
              end: event.endTime,
              venue: venueName,
              organizer: event.organizer,
            });
            window.open(`/api/events/ics?${params.toString()}`, "_blank");
          }}
        >
          <CalendarPlus className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

/* ── Loading skeleton (3 placeholder cards) ───────────────────────────── */

function EventCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden p-0 border border-border/40 shadow-premium-1">
      <div className="flex items-start gap-2.5 p-3 pb-2">
        <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton-shimmer h-3.5 w-3/4 rounded" />
          <div className="skeleton-shimmer h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="space-y-1.5 px-3">
        <div className="skeleton-shimmer h-2.5 w-2/3 rounded" />
        <div className="skeleton-shimmer h-2.5 w-1/2 rounded" />
        <div className="skeleton-shimmer h-2.5 w-3/4 rounded" />
      </div>
      <div className="skeleton-shimmer mx-3 mt-2 h-8 rounded" />
      <div className="mt-auto p-3 pt-2">
        <div className="skeleton-shimmer h-7 w-full rounded-md" />
      </div>
    </Card>
  );
}

/* ── Filter chip button ───────────────────────────────────────────────── */

function FilterChip({
  active,
  label,
  onClick,
  className,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium transition-colors",
        "hover:bg-accent/60 hover:text-accent-foreground",
        "data-[active=true]:border-transparent",
        className,
      )}
    >
      {label}
    </button>
  );
}

/* ── Main panel ───────────────────────────────────────────────────────── */

interface EventsPanelProps {
  /**
   * Called when the user clicks "Navigate to event" on a today/upcoming card.
   * The parent should set the venue slug as the destination in the planner,
   * switch to the Navigate tab, and trigger a route compute.
   */
  onNavigateToVenue: (venueSlug: string) => void;
  /**
   * Optional — when provided, each event card becomes clickable and clicking
   * the card body (not the "Navigate to event" button) fires this callback
   * with the venue's resolved lat/lng. The parent typically flies the map to
   * the venue and switches to the Navigate tab so the user can see the pan.
   */
  onEventVenueFocus?: (lat: number, lng: number, venueName: string) => void;
  /** Campus locations — used to resolve venue slugs → lat/lng for the focus callback. */
  locations?: CampusLocation[];
}

export function EventsPanel({
  onNavigateToVenue,
  onEventVenueFocus,
  locations,
}: EventsPanelProps) {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilterValue>("all");

  // Live status tick — re-render every 60s so "Today" / "Ongoing" / "Past"
  // pills stay accurate as time progresses without a refetch.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Build the query params from the active filters.
  const params = useMemo(() => {
    const p: {
      status?: EventStatusFilter;
      category?: EventCategory;
    } = {};
    if (statusFilter !== "all") p.status = statusFilter;
    if (categoryFilter !== "all") p.category = categoryFilter;
    return p;
  }, [statusFilter, categoryFilter]);

  // Fetch events whenever the filter changes.
  // NOTE: setLoading(true) at the top of the effect mirrors the canonical
  // "loading flag + async fetch" pattern used elsewhere in this codebase
  // (e.g. journey-history.tsx, challenges-panel.tsx). The
  // react-hooks/set-state-in-effect rule fires on synchronous setState calls
  // in an effect body, but the loading flag pattern is intentional here —
  // we want the UI to flip to "loading" synchronously when filters change
  // (otherwise users see stale data for one render).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .events(params)
      .then((res) => {
        setEvents(res.events);
        setError(null);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [params]);

  const handleNavigate = useCallback(
    (venueSlug: string) => {
      onNavigateToVenue(venueSlug);
    },
    [onNavigateToVenue],
  );

  const hasAny = events.length > 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-teal-50/40 to-emerald-50/20 p-4 dark:from-teal-950/20 dark:to-emerald-950/10">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Campus Events</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Cultural fests, tech talks, workshops, sports &amp; more. Tap
          &ldquo;Navigate to event&rdquo; to plot a walking route to the
          venue.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2 rounded-lg border bg-card/60 p-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3 w-3" />
          Status
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_CHIPS.map((chip) => (
            <FilterChip
              key={chip.value}
              active={statusFilter === chip.value}
              label={chip.label}
              onClick={() => setStatusFilter(chip.value)}
              className={chip.className}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3 w-3" />
          Category
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_CHIPS.map((chip) => (
            <FilterChip
              key={chip.value}
              active={categoryFilter === chip.value}
              label={chip.label}
              onClick={() => setCategoryFilter(chip.value)}
              className="data-[active=true]:bg-violet-600 data-[active=true]:text-white data-[active=true]:border-violet-600"
            />
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-rose-300/60 bg-rose-50/60 p-3 text-xs text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
          Failed to load events: {error}
        </div>
      )}

      {/* Scrollable events list */}
      <ScrollArea className="max-h-96 w-full rounded-lg">
        <div className="max-h-96 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent">
          {loading ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </div>
          ) : !hasAny ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No events match this filter</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Try a different status or category.
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {events.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  onNavigate={handleNavigate}
                  onEventVenueFocus={onEventVenueFocus}
                  locations={locations}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer count */}
      {!loading && hasAny && (
        <p className="text-center text-[10px] text-muted-foreground">
          {events.length} event{events.length === 1 ? "" : "s"}
          {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
          {categoryFilter !== "all" ? ` · ${categoryFilter.toLowerCase()}` : ""}
        </p>
      )}
    </div>
  );
}
