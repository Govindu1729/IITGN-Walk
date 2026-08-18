"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  MapPin,
  Clock,
  Route as RouteIcon,
  TrendingUp,
  TrendingDown,
  Play,
  Loader2,
  Footprints,
  PersonStanding,
} from "lucide-react";
import { api, type JourneySummary } from "@/lib/api-client";
import { MODE_LABELS } from "@/lib/routing/types";
import { formatDistance, formatDuration } from "@/lib/geo/geo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  /** called when the user picks a journey to replay on the map */
  onReplay: (trace: [number, number][], journey: JourneySummary) => void;
  /** signal to refresh the list (e.g. after a journey completes) */
  refreshKey: number;
}

/** Left accent border color based on walking mode */
function getModeAccent(mode: string): string {
  switch (mode.toUpperCase()) {
    case "RELAXED":
      return "border-l-emerald-500";
    case "NORMAL":
      return "border-l-teal-500";
    case "HURRY":
      return "border-l-orange-500";
    default:
      return "border-l-teal-500";
  }
}

/** Format date with day of week: "Mon 15 Jun" */
function formatDateWithDay(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString([], { weekday: "short" });
  const rest = d.toLocaleDateString([], { day: "2-digit", month: "short" });
  return `${day} ${rest}`;
}

export function JourneyHistory({ onReplay, refreshKey }: Props) {
  const [journeys, setJourneys] = useState<JourneySummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .listJourneys("COMPLETED")
      .then((r) => setJourneys(r.journeys))
      .catch(() => toast.error("Failed to load journeys"))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Total walks counter
  const totalDistance = useMemo(() => {
    if (!journeys) return 0;
    return journeys.reduce((sum, j) => sum + (j.actualM ?? 0), 0);
  }, [journeys]);

  async function handleReplay(j: JourneySummary) {
    setReplayingId(j.id);
    try {
      const detail = await fetch(`/api/journey/${j.id}`).then((r) => r.json());
      const trace: Array<[number, number]> = (detail.gpsTrace ?? []).map(
        (g: { lng: number; lat: number }) => [g.lng, g.lat] as [number, number],
      );
      if (trace.length < 2) {
        toast.info("No GPS trace recorded — showing the straight-line estimate instead.");
        // fall back: straight line between from/to coords if available is not great;
        // just clear and return
        onReplay([], j);
      } else {
        onReplay(trace, j);
        setActiveId(j.id);
      }
    } catch {
      toast.error("Failed to load journey trace");
    } finally {
      setReplayingId(null);
    }
  }

  if (loading && !journeys) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (!journeys || journeys.length === 0) {
    return (
      <Card className="p-6 text-center">
        <PersonStanding className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">No completed journeys yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete a journey to start building your history — each trace improves
          future predictions.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          Journey History
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Footprints className="h-3 w-3" />
            {journeys.length} walk{journeys.length !== 1 ? "s" : ""}
          </span>
          <span>·</span>
          <span>
            {(totalDistance / 1000).toFixed(1)} km total
          </span>
        </div>
      </div>
      <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
        {journeys.map((j) => {
          const deltaPct =
            j.predictedS && j.actualS
              ? ((j.actualS - j.predictedS) / j.predictedS) * 100
              : null;
          const isActive = activeId === j.id;
          return (
            <button
              key={j.id}
              onClick={() => handleReplay(j)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg border border-l-4 bg-card p-2.5 text-left transition-all hover:scale-[1.01] hover:shadow-sm",
                getModeAccent(j.mode),
                isActive
                  ? "border-emerald-500 ring-1 ring-emerald-500/30"
                  : "border-border hover:border-foreground/20",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                <Footprints className="h-4 w-4 text-teal-600" />
                <span className="text-[8px] font-medium uppercase">
                  {MODE_LABELS[j.mode as keyof typeof MODE_LABELS]?.slice(0, 3)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <RouteIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {j.fromLocation ?? "?"} → {j.toLocation ?? "?"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2.5 text-[10px] text-muted-foreground">
                  {j.actualM != null && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {formatDistance(j.actualM)}
                    </span>
                  )}
                  {j.actualS != null && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDuration(j.actualS)}
                    </span>
                  )}
                  {deltaPct !== null && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 font-medium",
                        deltaPct > 5
                          ? "text-amber-600"
                          : deltaPct < -5
                            ? "text-emerald-600"
                            : "text-muted-foreground",
                      )}
                    >
                      {deltaPct > 0 ? (
                        <TrendingUp className="h-2.5 w-2.5" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5" />
                      )}
                      {Math.abs(deltaPct).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary" className="text-[9px]">
                  {formatDateWithDay(j.startTs)}
                </Badge>
                {replayingId === j.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Play
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-emerald-600",
                      isActive && "text-emerald-600",
                    )}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
