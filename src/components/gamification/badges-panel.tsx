"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Footprints,
  Sunrise,
  Moon,
  Trophy,
  CalendarCheck,
  Compass,
  Zap,
  CloudRain,
  Users,
  GraduationCap,
  Check,
  Lock,
  Award,
  type LucideIcon,
} from "lucide-react";
import { BADGES, type Badge, type BadgeTier } from "@/lib/campus/badges";
import { useAppStore } from "@/hooks/use-app-store";
import { cn } from "@/lib/utils";

/* ── Icon mapping ────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, LucideIcon> = {
  Footprints,
  Sunrise,
  Moon,
  Trophy,
  CalendarCheck,
  Compass,
  Zap,
  CloudRain,
  Users,
  GraduationCap,
};

/* ── Tier colors ─────────────────────────────────────────────────────── */

const TIER_DOT: Record<BadgeTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
};

const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

/* ── Per-badge accent (unlocked tile gradient + icon tint) ──────────── */

interface Accent {
  /** Tailwind gradient classes for unlocked tile background. */
  tileBg: string;
  /** Text colour class for the icon when unlocked. */
  iconText: string;
}

const ACCENTS: Record<string, Accent> = {
  "first-steps": {
    tileBg: "bg-gradient-to-br from-teal-400 to-teal-600",
    iconText: "text-white",
  },
  "early-bird": {
    tileBg: "bg-gradient-to-br from-amber-300 to-amber-500",
    iconText: "text-white",
  },
  "night-owl": {
    tileBg: "bg-gradient-to-br from-violet-400 to-violet-600",
    iconText: "text-white",
  },
  "marathon-walker": {
    tileBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    iconText: "text-white",
  },
  "consistent": {
    tileBg: "bg-gradient-to-br from-teal-400 to-emerald-500",
    iconText: "text-white",
  },
  "explorer": {
    tileBg: "bg-gradient-to-br from-rose-400 to-rose-600",
    iconText: "text-white",
  },
  "speedster": {
    tileBg: "bg-gradient-to-br from-amber-400 to-orange-500",
    iconText: "text-white",
  },
  "rain-walker": {
    tileBg: "bg-gradient-to-br from-sky-400 to-cyan-500",
    iconText: "text-white",
  },
  "social-butterfly": {
    tileBg: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    iconText: "text-white",
  },
  "scholar": {
    tileBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
    iconText: "text-white",
  },
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

function formatUnlockedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ── Single badge card ──────────────────────────────────────────────── */

function BadgeCard({ badge, unlockedAt }: { badge: Badge; unlockedAt: string | null }) {
  const Icon = ICON_MAP[badge.icon] ?? Trophy;
  const accent = ACCENTS[badge.id] ?? ACCENTS["first-steps"];
  const isUnlocked = unlockedAt !== null;

  const tooltipText = isUnlocked
    ? `${badge.description} · Unlocked ${formatUnlockedDate(unlockedAt!)}`
    : `${badge.description} · ${TIER_LABEL[badge.tier]} tier · Locked`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="group"
          tabIndex={0}
          aria-label={`${badge.name} badge — ${isUnlocked ? "unlocked" : "locked"}`}
          className={cn(
            "relative flex cursor-default flex-col items-center gap-1.5 rounded-xl border border-border/40 p-2.5 text-center",
            "shadow-premium-1 transition-all duration-200 hover-lift hover:shadow-premium-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60",
            isUnlocked ? "bg-card" : "bg-muted/20",
          )}
        >
          {/* Lock / Check indicator (top-right corner) */}
          <div className="absolute right-1.5 top-1.5">
            {isUnlocked ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
              </span>
            ) : (
              <Lock className="h-3 w-3 text-muted-foreground/60" />
            )}
          </div>

          {/* Icon tile */}
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              isUnlocked
                ? cn(accent.tileBg, accent.iconText, "shadow-sm")
                : "bg-muted/60 grayscale opacity-40",
            )}
          >
            <Icon className="h-6 w-6" />
          </div>

          {/* Name (truncate) */}
          <p className="line-clamp-1 w-full text-xs font-semibold leading-tight">
            {badge.name}
          </p>

          {/* Tier dot */}
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: TIER_DOT[badge.tier] }}
          />

          {/* Description (2-line clamp) */}
          <p className="line-clamp-2 w-full text-[10px] leading-tight text-muted-foreground">
            {badge.description}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-center">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────── */

export function BadgesPanel() {
  const badges = useAppStore((s) => s.badges);

  const unlockedCount = useMemo(
    () => BADGES.filter((b) => Boolean(badges[b.id])).length,
    [badges],
  );
  const progressPct = (unlockedCount / BADGES.length) * 100;
  const noneUnlocked = unlockedCount === 0;

  return (
    <Card className="border-l-4 border-l-teal-400 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Award className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Achievement Badges
        </h3>
        <span className="ml-auto text-[11px] font-medium tabular-nums text-muted-foreground">
          Progress: {unlockedCount}/{BADGES.length} unlocked
        </span>
      </div>

      {/* Thin teal-emerald progress bar */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
      </div>

      {/* Empty-state motivational banner */}
      {noneUnlocked && (
        <div className="mb-3 rounded-lg border border-teal-200 bg-gradient-to-r from-teal-50/60 to-emerald-50/40 px-3 py-2 text-center text-[11px] text-teal-800 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200">
          🏆 Unlock badges by walking the campus! Complete journeys to earn your first badge.
        </div>
      )}

      {/* Badge grid: 2 cols mobile → 3 sm → 5 lg */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {BADGES.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            unlockedAt={badges[badge.id]?.unlockedAt ?? null}
          />
        ))}
      </div>
    </Card>
  );
}
