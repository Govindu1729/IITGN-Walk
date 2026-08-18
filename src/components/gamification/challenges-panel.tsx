"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Target,
  Zap,
  CloudRain,
  Sun,
  Moon,
  Accessibility,
  Crown,
  Sparkles,
  Flame,
  Award,
} from "lucide-react";
import { loadStats, type WalkingStats } from "@/lib/walking-stats";
import { useAppStore } from "@/hooks/use-app-store";
import { cn } from "@/lib/utils";
import { BadgesPanel } from "@/components/gamification/badges-panel";

// ── Challenge types ──

interface Challenge {
  id: string;
  title: string;
  description: string;
  targetDistanceM: number;
  targetJourneys: number;
  currentDistanceM: number;
  currentJourneys: number;
  deadline: string; // ISO date (end of week)
  completed: boolean;
  claimed: boolean;
  reward: string; // badge name
}

const STORAGE_KEY = "iitgn-challenges";

// ── Weekly challenge definitions ──

interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  targetDistanceM: number;
  targetJourneys: number;
  reward: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CHALLENGE_DEFS: ChallengeDef[] = [
  {
    id: "week-explorer",
    title: "Week Explorer",
    description: "Walk 3 km this week",
    targetDistanceM: 3000,
    targetJourneys: 0,
    reward: "explorer",
    icon: Target,
  },
  {
    id: "daily-walker",
    title: "Daily Walker",
    description: "Complete 5 journeys this week",
    targetDistanceM: 0,
    targetJourneys: 5,
    reward: "streak-3",
    icon: Zap,
  },
  {
    id: "rain-walker",
    title: "Rain Walker",
    description: "Complete 2 journeys in rain",
    targetDistanceM: 0,
    targetJourneys: 2,
    reward: "rain-warrior",
    icon: CloudRain,
  },
  {
    id: "early-bird",
    title: "Early Bird Special",
    description: "3 journeys before 8 AM",
    targetDistanceM: 0,
    targetJourneys: 3,
    reward: "early-bird",
    icon: Sun,
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "2 journeys after 9 PM",
    targetDistanceM: 0,
    targetJourneys: 2,
    reward: "night-walker",
    icon: Moon,
  },
  {
    id: "accessibility-advocate",
    title: "Accessibility Advocate",
    description: "3 accessible routes",
    targetDistanceM: 0,
    targetJourneys: 3,
    reward: "accessibility-champion",
    icon: Accessibility,
  },
];

// ── Helpers ──

function getWeekEnd(): string {
  const now = new Date();
  const day = now.getDay();
  // End of this week (Sunday 23:59:59)
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const end = new Date(now);
  end.setDate(end.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 0);
  return end.toISOString();
}

function getDaysUntilDeadline(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function loadChallenges(): Challenge[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Challenge[];
  } catch {
    return [];
  }
}

function saveChallenges(challenges: Challenge[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges));
  } catch { /* ignore */ }
}

/** Build current week's challenges from stats, creating new ones if needed. */
function buildChallenges(stats: WalkingStats): Challenge[] {
  const existing = loadChallenges();
  const weekEnd = getWeekEnd();

  // Check if existing challenges are for this week
  const isCurrentWeek = existing.length > 0 && existing[0].deadline === weekEnd;

  if (isCurrentWeek) {
    // Update progress from stats
    const updated = existing.map((c) => {
      const def = CHALLENGE_DEFS.find((d) => d.id === c.id);
      if (!def) return c;
      return {
        ...c,
        currentDistanceM: stats.totalDistanceM,
        currentJourneys: stats.totalJourneys,
        completed: def.targetDistanceM > 0
          ? stats.totalDistanceM >= def.targetDistanceM
          : stats.totalJourneys >= def.targetJourneys,
      };
    });
    saveChallenges(updated);
    return updated;
  }

  // New week — create fresh challenges
  const fresh: Challenge[] = CHALLENGE_DEFS.map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    targetDistanceM: def.targetDistanceM,
    targetJourneys: def.targetJourneys,
    currentDistanceM: stats.totalDistanceM,
    currentJourneys: stats.totalJourneys,
    deadline: weekEnd,
    completed: def.targetDistanceM > 0
      ? stats.totalDistanceM >= def.targetDistanceM
      : stats.totalJourneys >= def.targetJourneys,
    claimed: false,
    reward: def.reward,
  }));
  saveChallenges(fresh);
  return fresh;
}

// ── Simulated leaderboard ──

interface LeaderboardEntry {
  name: string;
  distanceKm: number;
  badges: number;
  isYou: boolean;
}

const SIMULATED_LEADERBOARD: LeaderboardEntry[] = [
  { name: "Priya S.", distanceKm: 12.4, badges: 6, isYou: false },
  { name: "Arjun M.", distanceKm: 9.8, badges: 5, isYou: false },
  { name: "Sneha K.", distanceKm: 8.2, badges: 4, isYou: false },
  { name: "You", distanceKm: 0, badges: 0, isYou: true },
  { name: "Rahul D.", distanceKm: 5.1, badges: 3, isYou: false },
  { name: "Ananya P.", distanceKm: 4.3, badges: 2, isYou: false },
  { name: "Karan V.", distanceKm: 3.7, badges: 2, isYou: false },
];

// ── Main component ──

export function ChallengesPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<WalkingStats | null>(null);

  useEffect(() => {
    const s = loadStats();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(s);
    setChallenges(buildChallenges(s));
  }, [refreshKey]);

  const leaderboard = useMemo(() => {
    if (!stats) return SIMULATED_LEADERBOARD;
    const yourDist = stats.totalDistanceM / 1000;
    const yourBadges = stats.badges.length;
    const updated = SIMULATED_LEADERBOARD.map((e) =>
      e.isYou ? { ...e, distanceKm: yourDist, badges: yourBadges } : e,
    );
    return updated.sort((a, b) => b.distanceKm - a.distanceKm);
  }, [stats]);

  const handleClaim = (challengeId: string) => {
    const updated = challenges.map((c) =>
      c.id === challengeId ? { ...c, claimed: true } : c,
    );
    setChallenges(updated);
    saveChallenges(updated);
  };

  const streak = useAppStore((s) => s.streak);

  return (
    <div className="space-y-3">
      {/* ── Streak Counter ─────────────────────────────────────────────── */}
      <Card className="border-l-4 border-l-amber-400 p-4 shadow-premium-1 hover-lift transition-shadow duration-200 hover:shadow-premium-2">
        <div className="flex items-center gap-3">
          {/* Fire icon tile */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60">
            <Flame className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            {streak.currentStreak === 0 && streak.totalWalkDays === 0 ? (
              <p className="italic text-xs text-muted-foreground">
                Start your first walk to build a streak! 🚶
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {streak.currentStreak}
                  </span>
                  <span className="text-xs text-muted-foreground">Day Streak</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>Longest: {streak.longestStreak} days</span>
                  <span>Total: {streak.totalWalkDays} days</span>
                </div>
              </>
            )}
          </div>
          {/* Streak badges */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            {streak.currentStreak >= 30 && (
              <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px]">
                <Crown className="h-2.5 w-2.5" />
                Monthly Master!
              </Badge>
            )}
            {streak.currentStreak >= 7 && (
              <Badge className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px]">
                <Trophy className="h-2.5 w-2.5" />
                Week Warrior!
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Weekly Challenges */}
      <Card className="border-l-4 border-l-emerald-400 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Weekly Challenges
          </h3>
        </div>

        <div className="space-y-2.5">
          {challenges.map((c) => {
            const def = CHALLENGE_DEFS.find((d) => d.id === c.id);
            const Icon = def?.icon ?? Target;
            const daysLeft = getDaysUntilDeadline(c.deadline);

            const progressPct = c.targetDistanceM > 0
              ? Math.min(100, (c.currentDistanceM / c.targetDistanceM) * 100)
              : c.targetJourneys > 0
                ? Math.min(100, (c.currentJourneys / c.targetJourneys) * 100)
                : 0;

            const currentLabel = c.targetDistanceM > 0
              ? `${(c.currentDistanceM / 1000).toFixed(2)} km`
              : `${c.currentJourneys} journeys`;
            const targetLabel = c.targetDistanceM > 0
              ? `${(c.targetDistanceM / 1000).toFixed(0)} km`
              : `${c.targetJourneys} journeys`;

            return (
              <div
                key={c.id}
                className={cn(
                  "relative rounded-xl border p-3 transition-all",
                  c.completed && !c.claimed
                    ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30"
                    : c.claimed
                      ? "border-muted bg-muted/30 opacity-70"
                      : "border-border bg-card/50",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    c.completed
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground",
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold truncate">{c.title}</p>
                      {c.completed && !c.claimed && (
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{c.description}</p>

                    {/* Gamified gradient progress bar */}
                    <div className="mt-2">
                      <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700 ease-out",
                            progressPct >= 100
                              ? "bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse"
                              : progressPct >= 67
                                ? "bg-gradient-to-r from-emerald-500 to-amber-500"
                                : progressPct >= 34
                                  ? "bg-gradient-to-r from-teal-400 to-emerald-500"
                                  : "bg-gradient-to-r from-slate-300 to-slate-400",
                          )}
                          style={{ width: `${Math.min(100, progressPct)}%` }}
                        />
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[9px] text-muted-foreground">
                        <span className="tabular-nums">{currentLabel} / {targetLabel}</span>
                        <span>{daysLeft}d left</span>
                      </div>
                    </div>

                    {/* Claim reward button */}
                    {c.completed && !c.claimed && (
                      <Button
                        size="sm"
                        className="mt-2 h-7 gap-1.5 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700"
                        onClick={() => handleClaim(c.id)}
                      >
                        <Sparkles className="h-3 w-3" />
                        Claim Reward: {c.reward}
                      </Button>
                    )}
                    {c.claimed && (
                      <Badge className="mt-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <Crown className="mr-1 h-2.5 w-2.5" />
                        {c.reward} unlocked!
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="border-l-4 border-l-amber-400 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Leaderboard
          </h3>
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px]">
            This Week
          </Badge>
        </div>

        <div className="space-y-1.5">
          {leaderboard.map((entry, idx) => (
            <div
              key={entry.name}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                entry.isYou
                  ? "bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800"
                  : "hover:bg-muted/50",
              )}
            >
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                idx === 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : idx === 1
                    ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    : idx === 2
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                      : "bg-muted text-muted-foreground",
              )}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-medium truncate",
                  entry.isYou && "text-teal-700 dark:text-teal-300",
                )}>
                  {entry.name}
                  {entry.isYou && (
                    <Badge className="ml-1.5 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[8px]">
                      You
                    </Badge>
                  )}
                </p>
              </div>
              <span className="text-[11px] tabular-nums font-medium">
                {entry.distanceKm.toFixed(1)} km
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                🏅{entry.badges}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Achievement Badges section divider ──────────────────────────── */}
      <div className="flex items-center gap-2 pt-2">
        <Award className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Achievement Badges
        </h3>
        <div className="ml-2 h-px flex-1 bg-gradient-to-r from-teal-300/60 to-transparent" />
      </div>

      {/* Collectible badges grid (renders below existing challenges) */}
      <BadgesPanel />
    </div>
  );
}
