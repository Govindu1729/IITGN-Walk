"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Footprints,
  Route as RouteIcon,
  Clock,
  Flame,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  type BadgeDef,
  type WalkingStats,
  BADGES,
  loadStats,
} from "@/lib/walking-stats";
import { cn } from "@/lib/utils";

interface Props {
  /** Pass-through signal: parent increments this whenever a journey is
   *  recorded so the panel can re-read fresh stats from localStorage. */
  refreshKey?: number;
}

/* ────────────────────────────────────────────────────────────────────────
   Stats summary card — totals across all journeys
   ──────────────────────────────────────────────────────────────────────── */
function StatsSummary({ stats }: { stats: WalkingStats }) {
  const totalDistanceKm = stats.totalDistanceM / 1000;
  const totalMinutes = Math.round(stats.totalTimeS / 60);

  const cells = [
    {
      icon: RouteIcon,
      label: "Distance",
      value:
        totalDistanceKm >= 1
          ? `${totalDistanceKm.toFixed(2)} km`
          : `${Math.round(stats.totalDistanceM)} m`,
      accent: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-50/60 dark:bg-teal-950/40",
    },
    {
      icon: Footprints,
      label: "Journeys",
      value: String(stats.totalJourneys),
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50/60 dark:bg-emerald-950/40",
    },
    {
      icon: Clock,
      label: "Walking time",
      value:
        totalMinutes >= 60
          ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
          : `${totalMinutes}m`,
      accent: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50/60 dark:bg-sky-950/40",
    },
    {
      icon: Flame,
      label: "Day streak",
      value: `${stats.streakDays} day${stats.streakDays === 1 ? "" : "s"}`,
      accent: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50/60 dark:bg-orange-950/40",
    },
  ];

  return (
    <Card className="border-l-4 border-l-amber-400 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your Walking Stats
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg p-2.5 text-center",
                c.bg,
              )}
            >
              <Icon className={cn("h-4 w-4", c.accent)} />
              <span className="text-base font-bold tabular-nums">{c.value}</span>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Single badge tile
   ──────────────────────────────────────────────────────────────────────── */
function BadgeTile({
  badge,
  stats,
}: {
  badge: BadgeDef;
  stats: WalkingStats;
}) {
  const isUnlocked = stats.badges.includes(badge.id);
  // progress is 0..1 even for unlocked (returns 1 for one-shot badges when condition met)
  const ratio = badge.progress(stats, {});
  const pct = Math.round(ratio * 100);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-200",
        isUnlocked
          ? cn(
              badge.unlockedClass,
              "border-transparent shadow-md hover:scale-[1.03] hover:shadow-lg",
            )
          : "border-border bg-card/50 opacity-70 grayscale hover:opacity-90",
      )}
    >
      {/* Lock overlay for locked badges */}
      {!isUnlocked && (
        <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground" />
      )}
      <span
        className={cn(
          "text-3xl leading-none",
          !isUnlocked && "opacity-50",
        )}
        aria-hidden
      >
        {badge.emoji}
      </span>
      <p
        className={cn(
          "text-[11px] font-semibold leading-tight",
          isUnlocked ? "text-white" : "text-foreground",
        )}
      >
        {badge.label}
      </p>
      <p
        className={cn(
          "text-[9px] leading-snug",
          isUnlocked ? "text-white/80" : "text-muted-foreground",
        )}
      >
        {badge.description}
      </p>

      {/* Progress bar (only for badges with progressLabel or progress > 0) */}
      {!isUnlocked && ratio > 0 && ratio < 1 && (
        <div className="mt-1 w-full">
          <Progress value={pct} className="h-1.5 bg-muted" />
          {badge.progressLabel && (
            <p className="mt-0.5 text-[9px] tabular-nums text-muted-foreground">
              {badge.progressLabel(stats, {})}
            </p>
          )}
        </div>
      )}
      {isUnlocked && (
        <Badge className="bg-white/20 text-[9px] text-white hover:bg-white/20">
          <Sparkles className="mr-0.5 h-2 w-2" />
          Unlocked
        </Badge>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Achievements panel — main component, mounted in the History tab
   ──────────────────────────────────────────────────────────────────────── */
export function AchievementsPanel({ refreshKey = 0 }: Props) {
  const [stats, setStats] = useState<WalkingStats | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(loadStats());
  }, [refreshKey]);

  if (!stats) {
    return (
      <Card className="p-4 text-center text-xs text-muted-foreground">
        Loading achievements…
      </Card>
    );
  }

  const unlockedCount = stats.badges.length;
  const totalCount = BADGES.length;
  const overallPct = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="space-y-2">
      {/* Summary card */}
      <StatsSummary stats={stats} />

      {/* Badges grid header */}
      <Card className="border-l-4 border-l-violet-400 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Achievements
            </h3>
          </div>
          <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
            {unlockedCount}/{totalCount}
          </Badge>
        </div>

        {/* Overall progress */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Badges unlocked</span>
            <span className="tabular-nums">{overallPct}%</span>
          </div>
          <Progress
            value={overallPct}
            className="h-2 bg-muted"
          />
        </div>

        {/* Badges grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BADGES.map((b) => (
            <BadgeTile key={b.id} badge={b} stats={stats} />
          ))}
        </div>

        {unlockedCount === 0 && (
          <p className="mt-3 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-center text-[11px] text-muted-foreground">
            Complete your first journey to start unlocking badges! 🎯
          </p>
        )}
      </Card>
    </div>
  );
}
