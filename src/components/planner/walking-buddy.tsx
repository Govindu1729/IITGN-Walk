"use client";

/**
 * Walking Buddy — pace matcher panel.
 *
 * Lets the user pick their personal target walking pace (Slow / Comfortable /
 * Brisk / Power-Walk, or anywhere in between via the slider) and compares it
 * against the predicted route pace, rendering a "buddy recommendation".
 *
 * The panel only renders when both `fromSlug` AND `toSlug` are set. When no
 * route has been computed yet, a default route pace of 1.2 m/s is used so the
 * user can experiment with the slider before hitting "Find routes".
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HeartPulse, Info, Check, Flame } from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import type { RouteResult, WalkingMode } from "@/lib/routing/types";
import { DEFAULT_SPEED_MPS, MODE_LABELS } from "@/lib/routing/types";
import {
  PACE_STOPS,
  PACE_MIN,
  PACE_MAX,
  PACE_STEP,
  closestMode,
  paceDelta,
  buddyMessage,
  type MatchKind,
} from "@/lib/routing/buddy";
import {
  estimateCaloriesByPace,
  calorieCategory,
  CALORIE_CATEGORY_COLOR,
  CALORIE_CATEGORY_LABEL,
} from "@/lib/routing/calories";
import { cn } from "@/lib/utils";

interface Props {
  fromSlug?: string | null;
  toSlug?: string | null;
  route?: RouteResult | null;
}

/** Default route pace (m/s) shown before a route has been computed. */
const DEFAULT_ROUTE_PACE = 1.2;

/** Pace-bar geometry constants. */
const BAR_MIN = PACE_MIN;
const BAR_MAX = PACE_MAX;

/** Map a pace (m/s) to a 0–100 percentage along the pace bar. */
function paceToPct(p: number): number {
  const span = BAR_MAX - BAR_MIN;
  return Math.min(100, Math.max(0, ((p - BAR_MIN) / span) * 100));
}

/** Tailwind classes for the delta text, by match grade. */
function deltaTextClass(match: MatchKind): string {
  switch (match) {
    case "great":
      return "text-emerald-700 dark:text-emerald-400";
    case "ok":
      return "text-amber-700 dark:text-amber-400";
    case "warn":
    case "bad":
      return "text-rose-700 dark:text-rose-400";
  }
}

/** Tailwind classes for the buddy-message pill background, by match grade. */
function buddyPillClass(match: MatchKind): string {
  switch (match) {
    case "great":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/60";
    case "ok":
      return "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/60";
    case "warn":
    case "bad":
      return "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800/60";
  }
}

const MODES: WalkingMode[] = ["RELAXED", "NORMAL", "HURRY"];

export function WalkingBuddy({ fromSlug, toSlug, route }: Props) {
  // Granular Zustand selectors — only re-render when these change.
  const personalPace = useAppStore((s) => s.personalPace);
  const setPersonalPace = useAppStore((s) => s.setPersonalPace);

  // Hide the panel entirely until the user has chosen both endpoints.
  if (!fromSlug || !toSlug) return null;

  return (
    <WalkingBuddyInner
      personalPace={personalPace}
      setPersonalPace={setPersonalPace}
      route={route ?? null}
    />
  );
}

interface InnerProps {
  personalPace: number;
  setPersonalPace: (v: number) => void;
  route: RouteResult | null;
}

function WalkingBuddyInner({ personalPace, setPersonalPace, route }: InnerProps) {
  // Predicted route pace: derived client-side from distance / duration.
  // Falls back to a constant default until the user computes a route.
  const routePace = useMemo(() => {
    if (route && route.durationS > 0) {
      return route.distanceM / route.durationS;
    }
    return DEFAULT_ROUTE_PACE;
  }, [route]);

  // Comparison + coaching message.
  const delta = useMemo(
    () => paceDelta(personalPace, routePace),
    [personalPace, routePace],
  );
  const message = useMemo(
    () => buddyMessage(delta.match, delta.direction),
    [delta.match, delta.direction],
  );

  // Which walking mode is closest to the user's slider value?
  const recommendedMode = useMemo(
    () => closestMode(personalPace),
    [personalPace],
  );

  // True when the slider sits exactly on a named stop.
  const onStop = PACE_STOPS.some((s) => Math.abs(s.value - personalPace) < 1e-6);

  const userPct = paceToPct(personalPace);
  const routePct = paceToPct(routePace);

  return (
    <Card className="shadow-premium-1 hover-lift hover:shadow-premium-2 animate-fade-in border-teal-200/50 bg-gradient-to-br from-teal-50/40 to-emerald-50/30 transition-all duration-200 dark:border-teal-900/40 dark:from-teal-950/20 dark:to-emerald-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
            <HeartPulse className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Walking Buddy
          </h3>
          <Badge
            variant="outline"
            className="border-teal-400/40 px-1.5 py-0 text-[9px] font-semibold tracking-wide text-teal-700 dark:text-teal-300"
          >
            BETA
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6 text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400"
                aria-label="What is Walking Buddy?"
              >
                <Info className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-xs">
              Pick your natural walking pace. We compare it to the route&apos;s
              predicted pace and suggest the best walking mode.
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Slider + live read-out ── */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Your pace
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tabular-nums text-teal-700 dark:text-teal-300">
                {personalPace.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground">m/s</span>
              {!onStop && (
                <Badge
                  variant="outline"
                  className="ml-1 border-amber-300/60 bg-amber-50 px-1.5 py-0 text-[9px] font-medium text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  Custom pace
                </Badge>
              )}
            </div>
          </div>

          <Slider
            value={[personalPace]}
            onValueChange={(v) => {
              const next = v[0];
              if (typeof next === "number") setPersonalPace(next);
            }}
            min={PACE_MIN}
            max={PACE_MAX}
            step={PACE_STEP}
            className={cn(
              "[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-teal-500 [&_[data-slot=slider-range]]:to-emerald-500",
              "[&_[data-slot=slider-thumb]]:border-teal-500 [&_[data-slot=slider-thumb]]:bg-white dark:[&_[data-slot=slider-thumb]]:bg-teal-950",
              "[&_[data-slot=slider-thumb]]:hover:border-teal-600",
            )}
            aria-label="Personal walking pace in metres per second"
          />

          {/* Stop labels under the slider */}
          <div className="flex justify-between px-0.5 text-[9px] text-muted-foreground">
            {PACE_STOPS.map((stop) => (
              <span
                key={stop.key}
                className={cn(
                  "flex flex-col items-center gap-0.5 text-center transition-colors",
                  Math.abs(stop.value - personalPace) < 1e-6
                    ? "text-teal-700 dark:text-teal-300"
                    : "",
                )}
              >
                <span>{stop.emoji}</span>
                <span className="leading-none">{stop.label}</span>
              </span>
            ))}
          </div>

          {/* Quick-pick chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PACE_STOPS.map((stop) => {
              const active = Math.abs(stop.value - personalPace) < 1e-6;
              return (
                <Badge
                  key={stop.key}
                  variant="outline"
                  className={cn(
                    "cursor-pointer select-none px-2 py-1 text-[10px] font-medium transition-all duration-200",
                    active
                      ? "border-teal-500 bg-teal-100 text-teal-800 dark:border-teal-700 dark:bg-teal-900/60 dark:text-teal-200"
                      : "border-border bg-background text-muted-foreground hover:border-teal-400/60 hover:bg-teal-50 hover:text-teal-700 dark:hover:border-teal-800/60 dark:hover:bg-teal-950/40 dark:hover:text-teal-300",
                  )}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`Set pace to ${stop.label} (${stop.value} m/s)`}
                  onClick={() => setPersonalPace(stop.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPersonalPace(stop.value);
                    }
                  }}
                >
                  <span aria-hidden="true">{stop.emoji}</span>
                  {stop.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* ── Comparison block ── */}
        <div className="rounded-lg border border-border/60 bg-background/60 p-3 dark:bg-background/40">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Pace comparison
            </span>
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-teal-500"
                  aria-hidden="true"
                />
                You
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rotate-45 bg-amber-500"
                  aria-hidden="true"
                />
                Route
              </span>
            </div>
          </div>

          {/* Pace bar — 200px min, grows on wide screens */}
          <div className="relative mx-auto h-8 w-full min-w-[200px] max-w-[320px]">
            {/* Track */}
            <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-gradient-to-r from-teal-100 via-muted to-amber-100 dark:from-teal-950/60 dark:via-muted/60 dark:to-amber-950/60" />
            {/* Stop tick marks */}
            {PACE_STOPS.map((stop) => {
              const pct = paceToPct(stop.value);
              return (
                <div
                  key={`tick-${stop.key}`}
                  className="absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-border/80"
                  style={{ left: `${pct}%` }}
                  aria-hidden="true"
                />
              );
            })}
            {/* Route pace marker — amber diamond */}
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border border-amber-700 bg-amber-500 shadow-sm transition-all duration-200"
              style={{ left: `${routePct}%` }}
              title={`Route pace: ${routePace.toFixed(2)} m/s`}
            />
            {/* User pace marker — teal circle (rendered last so it sits on top) */}
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-teal-600 shadow-sm transition-all duration-200 dark:border-teal-950"
              style={{ left: `${userPct}%` }}
              title={`Your pace: ${personalPace.toFixed(2)} m/s`}
            />
          </div>

          {/* Read-outs under the bar */}
          <div className="mt-1.5 flex items-baseline justify-between text-[10px]">
            <span className="text-muted-foreground">
              You:{" "}
              <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-300">
                {personalPace.toFixed(2)} m/s
              </span>
            </span>
            <span className="text-muted-foreground">
              Route:{" "}
              <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {routePace.toFixed(2)} m/s
              </span>
            </span>
          </div>

          {/* Delta text */}
          <p
            className={cn(
              "mt-2 text-center text-[11px] font-medium tabular-nums",
              deltaTextClass(delta.match),
            )}
          >
            Route is {Math.abs(delta.pctDiff).toFixed(0)}% {delta.direction}{" "}
            than your pace
          </p>

          {/* Buddy message pill */}
          <div
            className={cn(
              "mt-2 rounded-md px-2.5 py-1.5 text-center text-[11px] font-medium ring-1 ring-inset",
              buddyPillClass(delta.match),
            )}
          >
            {message}
          </div>
        </div>

        {/* ── Recommendation chips ── */}
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Recommended walking mode
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {MODES.map((mode) => {
              const isBest = mode === recommendedMode;
              return (
                <div
                  key={mode}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 text-center transition-all duration-200",
                    isBest
                      ? "border-teal-500 bg-teal-100 text-teal-800 shadow-sm dark:border-teal-700 dark:bg-teal-900/60 dark:text-teal-200"
                      : "border-border bg-background text-muted-foreground",
                  )}
                  role="status"
                  aria-label={`${MODE_LABELS[mode]} mode${
                    isBest ? " — closest to your pace" : ""
                  }`}
                >
                  <span className="flex items-center gap-1 text-[11px] font-semibold">
                    {isBest && <Check className="h-3 w-3" />}
                    {MODE_LABELS[mode]}
                  </span>
                  <span className="text-[9px] tabular-nums opacity-70">
                    {DEFAULT_SPEED_MPS[mode].toFixed(2)} m/s
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Calorie estimate ──
            Premium glassmorphic card showing estimated kcal burned for the
            route based on the user's personal pace. Updates live as the
            slider moves. */}
        {(() => {
          const distM = route?.distanceM ?? 0;
          const kcal = estimateCaloriesByPace(distM, route?.durationS ?? 0, personalPace);
          const cat = calorieCategory(kcal);
          const catColor = CALORIE_CATEGORY_COLOR[cat];
          const catLabel = CALORIE_CATEGORY_LABEL[cat];
          return (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200/50 bg-gradient-to-br from-amber-50/60 to-orange-50/30 px-3 py-2 shadow-premium-1 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Flame className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
                    {kcal}
                  </span>
                  <span className="text-[10px] text-muted-foreground">kcal</span>
                </div>
                <p className={cn("text-[10px] font-medium", catColor)}>
                  {catLabel}
                  {distM > 0 ? ` · ${(distM / 1000).toFixed(2)} km` : ""}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  Estimated calories burned based on your pace ({personalPace.toFixed(2)} m/s),
                  route distance, and a 65 kg reference body weight. Actual burn varies by
                  metabolism, terrain, and backpack weight.
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
