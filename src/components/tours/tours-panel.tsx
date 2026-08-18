"use client";

// Tours panel — curated thematic walking tours of the IITGN campus.
//
// Each card expands into a full itinerary; "Start Tour" pushes the first and
// last waypoints into the route planner (from→to) and triggers a route compute.
// The active tour + current waypoint index are kept in component state so the
// user can see their progress through the tour.

import { useMemo, useState, useCallback } from "react";
import { CAMPUS_TOURS, type CampusTour, type TourIcon } from "@/lib/campus/tours";
import type { CampusLocation } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Landmark,
  GraduationCap,
  Dumbbell,
  Trees,
  UtensilsCrossed,
  ChevronRight,
  ChevronDown,
  Clock,
  Footprints,
  Play,
  Circle,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Star,
} from "lucide-react";

/* ── Theme metadata ─────────────────────────────────────────────────── */

interface TourTheme {
  text: string;
  border: string;
  bg: string;
  bgSoft: string;
  badge: string;
  gradient: string;
  glow: string;
  dot: string;
}

const THEMES: Record<CampusTour["themeColor"], TourTheme> = {
  amber: {
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-700",
    bg: "bg-amber-100 dark:bg-amber-950/50",
    bgSoft: "bg-amber-50/60 dark:bg-amber-950/20",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    gradient: "from-amber-50/70 to-orange-50/30 dark:from-amber-950/30 dark:to-orange-950/20",
    glow: "0 0 12px 2px rgba(217,119,6,0.2)",
    dot: "bg-amber-500",
  },
  teal: {
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-300 dark:border-teal-700",
    bg: "bg-teal-100 dark:bg-teal-950/50",
    bgSoft: "bg-teal-50/60 dark:bg-teal-950/20",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
    gradient: "from-teal-50/70 to-emerald-50/30 dark:from-teal-950/30 dark:to-emerald-950/20",
    glow: "0 0 12px 2px rgba(13,148,136,0.2)",
    dot: "bg-teal-500",
  },
  violet: {
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-300 dark:border-violet-700",
    bg: "bg-violet-100 dark:bg-violet-950/50",
    bgSoft: "bg-violet-50/60 dark:bg-violet-950/20",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    gradient: "from-violet-50/70 to-purple-50/30 dark:from-violet-950/30 dark:to-purple-950/20",
    glow: "0 0 12px 2px rgba(124,58,237,0.2)",
    dot: "bg-violet-500",
  },
  emerald: {
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-700",
    bg: "bg-emerald-100 dark:bg-emerald-950/50",
    bgSoft: "bg-emerald-50/60 dark:bg-emerald-950/20",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    gradient: "from-emerald-50/70 to-green-50/30 dark:from-emerald-950/30 dark:to-green-950/20",
    glow: "0 0 12px 2px rgba(16,185,129,0.2)",
    dot: "bg-emerald-500",
  },
  rose: {
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-300 dark:border-rose-700",
    bg: "bg-rose-100 dark:bg-rose-950/50",
    bgSoft: "bg-rose-50/60 dark:bg-rose-950/20",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    gradient: "from-rose-50/70 to-pink-50/30 dark:from-rose-950/30 dark:to-pink-950/20",
    glow: "0 0 12px 2px rgba(225,29,72,0.2)",
    dot: "bg-rose-500",
  },
  sky: {
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-300 dark:border-sky-700",
    bg: "bg-sky-100 dark:bg-sky-950/50",
    bgSoft: "bg-sky-50/60 dark:bg-sky-950/20",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    gradient: "from-sky-50/70 to-cyan-50/30 dark:from-sky-950/30 dark:to-cyan-950/20",
    glow: "0 0 12px 2px rgba(14,165,233,0.2)",
    dot: "bg-sky-500",
  },
  orange: {
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-300 dark:border-orange-700",
    bg: "bg-orange-100 dark:bg-orange-950/50",
    bgSoft: "bg-orange-50/60 dark:bg-orange-950/20",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    gradient: "from-orange-50/70 to-amber-50/30 dark:from-orange-950/30 dark:to-amber-950/20",
    glow: "0 0 12px 2px rgba(234,88,12,0.2)",
    dot: "bg-orange-500",
  },
};

const ICONS: Record<TourIcon, React.ComponentType<{ className?: string }>> = {
  landmark: Landmark,
  academic: GraduationCap,
  sports: Dumbbell,
  nature: Trees,
  dining: UtensilsCrossed,
};

/* ── Props ───────────────────────────────────────────────────────────── */

interface Props {
  /** All known campus locations — used to look up waypoint names by slug. */
  locations: CampusLocation[];
  /**
   * Called when the user clicks "Start Tour". The parent should set
   * `from` and `to` in the route planner (and trigger a route compute).
   */
  onStartTour: (fromSlug: string, toSlug: string, tourId: string) => void;
  /**
   * Optional: the slug the user is currently at (e.g. GPS-derived). Drives the
   * "current waypoint" highlight. When null, the user can click a waypoint to
   * mark it as current.
   */
  activeTourId?: string | null;
  activeWaypointIdx?: number | null;
}

/* ── Component ───────────────────────────────────────────────────────── */

export function ToursPanel({
  locations,
  onStartTour,
  activeTourId,
  activeWaypointIdx,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(activeTourId ?? null);
  const [localActiveIdx, setLocalActiveIdx] = useState<number | null>(
    activeWaypointIdx ?? null,
  );

  // Sync expanded tour if the parent's activeTourId changes.
  const expanded = expandedId ?? activeTourId ?? null;

  const locMap = useMemo(() => {
    const m = new Map<string, CampusLocation>();
    for (const l of locations) m.set(l.slug, l);
    return m;
  }, [locations]);

  const handleToggle = useCallback(
    (id: string) => {
      setExpandedId((cur) => (cur === id ? null : id));
    },
    [],
  );

  const handleStart = useCallback(
    (tour: CampusTour) => {
      const first = tour.waypoints[0];
      const last = tour.waypoints[tour.waypoints.length - 1];
      if (!first || !last) return;
      setLocalActiveIdx(0);
      onStartTour(first, last, tour.id);
    },
    [onStartTour],
  );

  const handleWaypointClick = useCallback(
    (idx: number) => {
      setLocalActiveIdx(idx);
    },
    [],
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-teal-50/40 to-emerald-50/20 p-4 dark:from-teal-950/20 dark:to-emerald-950/10">
        <div className="flex items-center gap-2">
          <Footprints className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Curated Campus Tours</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a themed walking tour. We&apos;ll plot the route from start to
          finish — follow the highlighted path and tick off each waypoint.
        </p>
      </div>

      {/* Tour cards */}
      <div className="grid gap-2.5">
        {CAMPUS_TOURS.map((tour) => {
          const theme = THEMES[tour.themeColor];
          const Icon = ICONS[tour.icon];
          const isOpen = expanded === tour.id;
          const isCurrentTour = activeTourId === tour.id;
          const currentIdx =
            isCurrentTour ? (activeWaypointIdx ?? 0) : (isOpen ? localActiveIdx : null);

          return (
            <Card
              key={tour.id}
              className={cn(
                "hover-lift overflow-hidden p-0 border border-border/40 transition-all duration-200 shadow-premium-1 hover:shadow-premium-2",
                "border-l-4",
                theme.border,
                isOpen && "shadow-premium-2",
              )}
              style={isOpen ? { boxShadow: theme.glow } : undefined}
            >
              {/* Clickable header */}
              <button
                type="button"
                onClick={() => handleToggle(tour.id)}
                className={cn(
                  "flex w-full items-start gap-3 p-3 text-left transition-colors",
                  "hover:bg-accent/40",
                )}
                aria-expanded={isOpen}
              >
                {/* Icon tile */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    theme.bg,
                    theme.text,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Title + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate text-sm font-semibold">{tour.name}</h4>
                    <div className="flex items-center gap-1.5">
                      {/* Tour stop progress indicator */}
                      {!isOpen && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {tour.waypoints.length} stops
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {tour.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={cn("gap-1 px-1.5 py-0 text-[10px]", theme.badge)}
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {tour.durationMin} min
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="gap-1 px-1.5 py-0 text-[10px]"
                    >
                      <Footprints className="h-2.5 w-2.5" />
                      {(tour.distanceM / 1000).toFixed(2)} km
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="gap-1 px-1.5 py-0 text-[10px]"
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      {tour.waypoints.length} stops
                    </Badge>
                    {/* Difficulty rating — 1-5 stars with colored tier */}
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-medium"
                      title={`Difficulty: ${tour.difficulty}/5 — ${
                        tour.difficulty <= 1
                          ? "Easy flat stroll"
                          : tour.difficulty <= 2
                            ? "Gentle inclines"
                            : tour.difficulty <= 3
                              ? "Some hills/stairs"
                              : tour.difficulty <= 4
                                ? "Steep in places"
                                : "Strenuous"
                      }`}
                      style={{
                        borderColor:
                          tour.difficulty <= 2
                            ? "oklch(0.84 0.12 165)"
                            : tour.difficulty <= 3
                              ? "oklch(0.82 0.13 75)"
                              : "oklch(0.7 0.18 25)",
                        color:
                          tour.difficulty <= 2
                            ? "oklch(0.45 0.13 165)"
                            : tour.difficulty <= 3
                              ? "oklch(0.55 0.14 75)"
                              : "oklch(0.5 0.18 25)",
                        backgroundColor:
                          tour.difficulty <= 2
                            ? "oklch(0.95 0.04 165 / 0.4)"
                            : tour.difficulty <= 3
                              ? "oklch(0.95 0.05 75 / 0.4)"
                              : "oklch(0.95 0.05 25 / 0.4)",
                      }}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-2 w-2",
                            i < tour.difficulty ? "fill-current" : "fill-none opacity-30",
                          )}
                        />
                      ))}
                      <span className="ml-1 tabular-nums">{tour.difficulty}/5</span>
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded itinerary */}
              {isOpen && (
                <div
                  className={cn(
                    "animate-fade-in border-t bg-gradient-to-br p-3",
                    theme.gradient,
                  )}
                >
                  <p className="mb-3 text-xs leading-relaxed text-foreground/80">
                    {tour.summary}
                  </p>

                  {/* Waypoints list */}
                  <ol className="relative space-y-2.5 pl-1">
                    {/* Vertical line */}
                    <div
                      className={cn(
                        "absolute left-[7px] top-2 bottom-2 w-0.5",
                        theme.bg,
                      )}
                    />
                    {tour.waypoints.map((slug, idx) => {
                      const loc = locMap.get(slug);
                      const isCurrent = currentIdx === idx;
                      const isPast =
                        currentIdx !== null && idx < currentIdx;
                      const isLast = idx === tour.waypoints.length - 1;
                      return (
                        <li
                          key={`${slug}-${idx}`}
                          className="relative flex items-start gap-2.5 pl-0"
                        >
                          <button
                            type="button"
                            onClick={() => handleWaypointClick(idx)}
                            className="relative z-10 mt-0.5 shrink-0"
                            aria-label={`Mark waypoint ${idx + 1} as current`}
                          >
                            {isPast ? (
                              <CheckCircle2
                                className={cn("h-4 w-4", theme.text)}
                              />
                            ) : isCurrent ? (
                              <span
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded-full",
                                  theme.bg,
                                  theme.text,
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-2 w-2 animate-pulse rounded-full",
                                    theme.dot,
                                  )}
                                />
                              </span>
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground/50" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-xs font-medium",
                                isCurrent
                                  ? theme.text
                                  : isPast
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground",
                              )}
                            >
                              {idx + 1}. {loc?.name ?? slug}
                            </p>
                            {isLast && (
                              <p className="text-[10px] text-muted-foreground">
                                Tour finish
                              </p>
                            )}
                            {idx === 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                Tour start
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {/* Start button */}
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      size="sm"
                      className={cn(
                        "flex-1 gap-1.5",
                        "bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800",
                      )}
                      onClick={() => handleStart(tour)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start Tour
                    </Button>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      Routes plotted in Navigate tab
                    </span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
