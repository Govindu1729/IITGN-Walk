"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Footprints,
  Navigation2,
  AlertTriangle,
  Square,
  Gauge,
  Zap,
  PartyPopper,
} from "lucide-react";
import { VoiceToggle } from "./voice-toggle";
import { useVoiceNavigation } from "@/hooks/use-voice-navigation";
import {
  formatDuration,
  formatEta,
  formatDistanceAuto,
  haversine,
} from "@/lib/geo/geo";
import type { CampusLocation } from "@/lib/api-client";
import type {
  DirectionStep,
  RouteResult,
  WalkingMode,
} from "@/lib/routing/types";
import type { GeoPos } from "@/hooks/use-geolocation";
import { cn } from "@/lib/utils";

interface Props {
  journeyId: string | null;
  fromLocation?: CampusLocation;
  toLocation?: CampusLocation;
  fromPos: GeoPos | null;
  mode: WalkingMode;
  route: RouteResult | null;
  livePos: GeoPos | null;
  gpsTrace: GeoPos[];
  startedAt: number | null;
  onArrived: () => void;
  onAbandon: () => void;
  gpsError: string | null;
  /** Distance units: METRIC (default) or IMPERIAL. */
  units?: "METRIC" | "IMPERIAL";
  /** Index of the active direction step (for voice nav). */
  activeStepIndex?: number;
}

function getModeIcon(mode: WalkingMode) {
  switch (mode) {
    case "RELAXED":
      return <Footprints className="h-3 w-3" />;
    case "NORMAL":
      return <Gauge className="h-3 w-3" />;
    case "HURRY":
      return <Zap className="h-3 w-3" />;
  }
}

function getMotivationalMessage(progress: number): string {
  if (progress < 10) return "Just starting!";
  if (progress < 50) return "Keep going!";
  if (progress < 90) return "Almost there!";
  return "You're nearly at your destination!";
}

const TURN_MANEUVERS: ReadonlySet<DirectionStep["maneuver"]> = new Set([
  "TURN_LEFT",
  "TURN_RIGHT",
  "SHARP_LEFT",
  "SHARP_RIGHT",
  "SLIGHT_LEFT",
  "SLIGHT_RIGHT",
]);

/**
 * Convert a routing DirectionStep into a natural-language spoken instruction
 * suitable for TTS announcement.
 *
 * Examples:
 *   - "In 50 metres, Turn left at Library Walk"
 *   - "Continue north for 100 metres"
 *   - "You have arrived at Library"
 *
 * Uses the step's `instruction`, `distanceM`, and `endLabel` (a.k.a. endNode
 * label) fields. For turns within the upcoming 200 m, prepends an
 * "In X metres," distance cue so the user gets advance warning.
 */
function formatSpokenInstruction(step: DirectionStep): string {
  if (step.maneuver === "ARRIVE") {
    return step.endLabel
      ? `You have arrived at ${step.endLabel}`
      : "You have arrived at your destination";
  }

  if (
    TURN_MANEUVERS.has(step.maneuver) &&
    step.distanceM > 5 &&
    step.distanceM <= 200
  ) {
    return `In ${Math.round(step.distanceM)} metres, ${step.instruction}`;
  }

  return step.instruction;
}

export function NavigationPanel({
  journeyId,
  toLocation,
  mode,
  route,
  livePos,
  gpsTrace,
  startedAt,
  onArrived,
  onAbandon,
  gpsError,
  units = "METRIC",
  activeStepIndex = 0,
}: Props) {
  const [now, setNow] = useState(Date.now());
  const [arrivedPressed, setArrivedPressed] = useState(false);

  // Voice navigation — client-side Web Speech API only (no /api/tts call,
  // which would be too slow for real-time turn-by-turn announcements).
  const {
    enabled: voiceEnabled,
    supported: voiceSupported,
    toggle: voiceToggle,
    speak: voiceSpeak,
    cancel: voiceCancel,
  } = useVoiceNavigation();
  // Tracks the text of the most recent announcement so we don't re-speak
  // the same instruction when unrelated deps (e.g. the chosen voice) change.
  const lastSpokenTextRef = useRef<string>("");

  useEffect(() => {
    if (!journeyId) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [journeyId]);

  // Cancel any pending speech + reset the dedup cache whenever voice is off.
  // (Runs on initial mount too, where voiceEnabled is false — harmless.)
  useEffect(() => {
    if (!voiceEnabled) {
      lastSpokenTextRef.current = "";
      voiceCancel();
    }
  }, [voiceEnabled, voiceCancel]);

  // Announce the current step's instruction when the active step changes
  // (and voice is enabled). Skips re-speaking the same text — important
  // because `voiceSpeak`'s identity can change when the chosen voice loads,
  // which would otherwise cause duplicate announcements.
  useEffect(() => {
    if (!voiceEnabled) return;
    const steps = route?.steps;
    if (!steps?.length) return;
    if (activeStepIndex < 0 || activeStepIndex >= steps.length) return;

    const step = steps[activeStepIndex];
    const text = formatSpokenInstruction(step);
    if (text === lastSpokenTextRef.current) return;

    voiceSpeak(text);
    lastSpokenTextRef.current = text;
  }, [voiceEnabled, voiceSpeak, activeStepIndex, route?.steps]);

  if (!journeyId || !route) return null;

  const elapsedS = startedAt ? (now - startedAt) / 1000 : 0;
  const remainingM = livePos
    ? haversine(
        { lat: livePos.lat, lng: livePos.lng },
        { lat: route.path[route.path.length - 1][1], lng: route.path[route.path.length - 1][0] },
      )
    : route.distanceM;

  const progress = Math.min(
    100,
    Math.max(0, ((route.distanceM - remainingM) / route.distanceM) * 100),
  );

  // dynamic ETA = now + (remaining / avgSpeedSoFar) if we have elapsed data
  const speedSoFar =
    elapsedS > 5 && gpsTrace.length > 1
      ? haversine(
          { lat: gpsTrace[0].lat, lng: gpsTrace[0].lng },
          { lat: livePos!.lat, lng: livePos!.lng },
        ) / elapsedS
      : route.speedMps;
  const remainingS = remainingM / Math.max(0.1, speedSoFar);
  const etaIso = new Date(now + remainingS * 1000).toISOString();

  return (
    <Card className="overflow-hidden border-teal-200/60 bg-gradient-to-br from-teal-50 to-emerald-50/50 p-4 dark:border-teal-900/60 dark:from-teal-950/30 dark:to-emerald-950/20">
      {/* Shimmer gradient bar at top */}
      <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden rounded-t-xl">
        <div
          className="h-full w-[200%] animate-shimmer"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.6 0.12 180 / 0.3) 0%, oklch(0.65 0.15 160 / 0.6) 25%, oklch(0.6 0.12 180 / 0.3) 50%, oklch(0.65 0.15 160 / 0.6) 75%, oklch(0.6 0.12 180 / 0.3) 100%)",
          }}
        />
      </div>

      {/* Elapsed time as prominent large number */}
      <div className="mb-2 text-center">
        <p className="text-4xl font-extrabold tabular-nums tracking-tight text-teal-700 dark:text-teal-300">
          {formatDuration(elapsedS)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          elapsed
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Pulsing ring animation around GPS dot */}
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-75" />
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full border-2 border-teal-400" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-600" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Navigating
          </span>
        </div>
        <Badge variant="secondary" className="gap-1 text-[10px]">
          {getModeIcon(mode)}
          {mode.toLowerCase()}
        </Badge>
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <Footprints className="h-4 w-4 text-teal-600" />
        <span className="text-sm font-semibold">
          Destination: {toLocation?.name ?? "Selected location"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat
          icon={<Clock className="h-3.5 w-3.5" />}
          label="ETA"
          value={formatEta(etaIso)}
          accent
        />
        <Stat
          icon={<Navigation2 className="h-3.5 w-3.5" />}
          label="Remaining"
          value={formatDistanceAuto(remainingM, units)}
        />
        <Stat
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Elapsed"
          value={formatDuration(elapsedS)}
        />
      </div>

      <div className="mt-3">
        <Progress value={progress} className="h-2" />
        {/* Distance markers on progress bar */}
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/60">
          <span>{units === "IMPERIAL" ? "0 ft" : "0 m"}</span>
          <span>{formatDistanceAuto(route.distanceM * 0.25, units)}</span>
          <span>{formatDistanceAuto(route.distanceM * 0.5, units)}</span>
          <span>{formatDistanceAuto(route.distanceM * 0.75, units)}</span>
          <span>{formatDistanceAuto(route.distanceM, units)}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <p className="text-[10px] font-medium text-teal-600 dark:text-teal-400">
            {getMotivationalMessage(progress)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {progress.toFixed(0)}% of route
          </p>
        </div>
      </div>

      {livePos && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          GPS: {livePos.lat.toFixed(5)}, {livePos.lng.toFixed(5)}
          {livePos.accuracyM ? ` · ±${Math.round(livePos.accuracyM)}m` : ""}
        </p>
      )}

      {gpsError && (
        <p className="mt-2 flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[11px] text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-3 w-3" />
          GPS: {gpsError}. Continuing with route preview.
        </p>
      )}

      {route.steps && route.steps.length > 0 && (
        <div className="mb-1 mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          {route.steps.length} turn-by-turn step{route.steps.length === 1 ? "" : "s"}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <VoiceToggle
          enabled={voiceEnabled}
          supported={voiceSupported}
          onToggle={voiceToggle}
        />
        <Button
          onClick={() => {
            setArrivedPressed(true);
            // Clear any pending turn announcement, then speak arrival.
            voiceCancel();
            voiceSpeak(
              "Journey complete! You have arrived at your destination.",
            );
            onArrived();
          }}
          className={cn(
            "flex-1 gap-1.5 text-white",
            arrivedPressed
              ? "animate-celebrate bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
          )}
        >
          {arrivedPressed ? (
            <PartyPopper className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {arrivedPressed ? "Arrived! 🎉" : "I've Arrived"}
        </Button>
        <Button onClick={onAbandon} variant="outline" size="icon">
          <Square className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-lg p-2 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5",
        accent && "border-teal-300/60 bg-teal-50/80 dark:border-teal-800/60 dark:bg-teal-950/40 ring-1 ring-teal-300/30 dark:ring-teal-700/30",
      )}
    >
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn(
        "mt-0.5 text-sm font-bold tabular-nums",
        accent && "text-teal-700 dark:text-teal-300",
      )}>
        {value}
      </div>
    </div>
  );
}
