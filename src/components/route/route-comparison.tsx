"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatEta,
  formatDistanceAuto,
} from "@/lib/geo/geo";
import type { MultiRouteResult, RouteResult } from "@/lib/routing/types";
import {
  Gauge,
  Ruler,
  Sparkles,
  Route as RouteIcon,
  Clock,
  MapPin,
  Sun,
  Accessibility,
  Footprints,
  AlertTriangle,
  TreePine,
  Star,
  Share2,
  Mountain,
  Waves,
  Plane,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TranslationKey } from "@/lib/i18n/use-translation";
import { estimateCalories } from "@/lib/routing/calories";

interface Props {
  routes: MultiRouteResult | null;
  selectedObjective: "FASTEST" | "SHORTEST" | "EASIEST" | "ALTERNATIVE";
  onSelect: (o: Props["selectedObjective"]) => void;
  journeyActive: boolean;
  fromSlug: string | null;
  toSlug: string | null;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onShare: () => void;
  /** Weather impact factor (<1 = slower walking); applied to displayed durations */
  weatherImpactFactor?: number;
  /** Distance units: "METRIC" (default) or "IMPERIAL". */
  units?: "METRIC" | "IMPERIAL";
  /** Whether to render the elevation profile mini-chart. Default true. */
  showElevation?: boolean;
}

/* ────────────────────────────────────────────
   Quality-tag detection from reason text
   ──────────────────────────────────────────── */
interface QualityTag {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}

function deriveQualityTags(reason: string): QualityTag[] {
  const lower = reason.toLowerCase();
  const tags: QualityTag[] = [];

  if (lower.includes("well lit")) {
    tags.push({
      label: "Well-lit",
      icon: Sun,
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    });
  }

  // "no steps" + no dirt mention → accessible
  if (
    (lower.includes("no steps") || lower.includes("step-free")) &&
    !lower.includes("dirt")
  ) {
    tags.push({
      label: "Accessible",
      icon: Accessibility,
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    });
  }

  if (lower.includes("fully paved") || lower.includes("all paved")) {
    tags.push({
      label: "Paved",
      icon: Footprints,
      className:
        "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    });
  }

  if (lower.includes("stair") || (lower.includes("steps") && !lower.includes("no steps") && !lower.includes("step-free"))) {
    tags.push({
      label: "Has Steps",
      icon: AlertTriangle,
      className:
        "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    });
  }

  if (lower.includes("dirt")) {
    tags.push({
      label: "Dirt Path",
      icon: TreePine,
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
    });
  }

  return tags;
}

/* ────────────────────────────────────────────
   Terrain indicator based on difficulty
   ──────────────────────────────────────────── */
function TerrainIndicator({ difficulty }: { difficulty: number }) {
  if (difficulty < 30) {
    return (
      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <Plane className="h-3 w-3" />
        <span className="text-[9px] uppercase">Flat</span>
      </div>
    );
  }
  if (difficulty < 60) {
    return (
      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <Waves className="h-3 w-3" />
        <span className="text-[9px] uppercase">Rolling</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
      <Mountain className="h-3 w-3" />
      <span className="text-[9px] uppercase">Hilly</span>
    </div>
  );
}

/* ────────────────────────────────────────────
   Elevation Profile mini-chart (SVG)
   Derives synthetic elevation from the route's difficulty score.
   ──────────────────────────────────────────── */
const ELEVATION_COLORS = {
  FASTEST: "#0d9488",
  SHORTEST: "#d97706",
  EASIEST: "#7c3aed",
  ALTERNATIVE: "#e11d48",
} as const;

function ElevationProfile({
  difficulty,
  pathCoords,
  objective,
}: {
  difficulty: number;
  pathCoords: [number, number][];
  objective: keyof typeof ELEVATION_COLORS;
}) {
  const width = 200;
  const height = 40;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  // Peak height proportional to difficulty (0..100)
  const peakH = (difficulty / 100) * innerH;
  const numPoints = Math.max(2, Math.min(pathCoords.length, 20));

  // Build a terrain profile: flat → gradual rise → peak → descent → flat
  const points: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1); // 0..1
    const x = padding + t * innerW;
    // Bell-like elevation curve peaking at t=0.5
    const elevation = peakH * Math.exp(-((t - 0.45) ** 2) / (2 * 0.12));
    const y = height - padding - elevation; // SVG y is top-down
    points.push([x, y]);
  }

  // Build SVG path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  // Fill area (close back to baseline)
  const fillPath = `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${height - padding} L ${points[0][0].toFixed(1)} ${height - padding} Z`;

  const color = ELEVATION_COLORS[objective];
  const elevGainM = Math.round(difficulty * 0.3); // approximate meters of elevation change

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-10 rounded overflow-hidden"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`elev-grad-${objective}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#elev-grad-${objective})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <p className="mt-0.5 text-[9px] text-muted-foreground">
        Elevation gain: ~{elevGainM}m
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────
   Per-objective visual metadata
   ──────────────────────────────────────────── */
const META = {
  FASTEST: {
    labelKey: "label.fastest" as TranslationKey,
    icon: Gauge,
    color: "text-teal-600",
    ring: "ring-teal-500/40",
    border: "border-teal-500",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
    gradient: "from-teal-50/60",
    borderAccent: "border-l-teal-500",
    glowShadow: "0 0 12px 2px rgba(13,148,136,0.2)",
    diffGradient: "from-teal-400 to-emerald-500",
  },
  SHORTEST: {
    labelKey: "label.shortest" as TranslationKey,
    icon: Ruler,
    color: "text-amber-600",
    ring: "ring-amber-500/40",
    border: "border-amber-500",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    gradient: "from-amber-50/60",
    borderAccent: "border-l-amber-500",
    glowShadow: "0 0 12px 2px rgba(217,119,6,0.2)",
    diffGradient: "from-amber-400 to-orange-500",
  },
  EASIEST: {
    labelKey: "label.easiest" as TranslationKey,
    icon: Sparkles,
    color: "text-violet-600",
    ring: "ring-violet-500/40",
    border: "border-violet-500",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    gradient: "from-violet-50/60",
    borderAccent: "border-l-violet-500",
    glowShadow: "0 0 12px 2px rgba(124,58,237,0.2)",
    diffGradient: "from-violet-400 to-purple-500",
  },
  ALTERNATIVE: {
    labelKey: "label.alternative" as TranslationKey,
    icon: RouteIcon,
    color: "text-sky-600",
    ring: "ring-sky-500/40",
    border: "border-sky-500",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    gradient: "from-sky-50/60",
    borderAccent: "border-l-sky-500",
    glowShadow: "0 0 12px 2px rgba(37,99,235,0.2)",
    diffGradient: "from-sky-400 to-cyan-500",
  },
} as const;

/* ────────────────────────────────────────────
   Format the "vs fastest" delta
   ──────────────────────────────────────────── */
function formatVsFastest(deltaS: number, isFastest: boolean): string {
  if (isFastest) return "Fastest route";
  if (deltaS <= 0) return "Same as fastest";
  const deltaMin = deltaS / 60;
  if (deltaMin < 0.1) return "< 0.1 min vs fastest";
  return `+${deltaMin.toFixed(1)} min vs fastest`;
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
export function RouteComparison({
  routes,
  selectedObjective,
  onSelect,
  journeyActive,
  fromSlug,
  toSlug,
  isBookmarked,
  onToggleBookmark,
  onShare,
  weatherImpactFactor = 1.0,
  units = "METRIC",
  showElevation = true,
}: Props) {
  const { t } = useTranslation();
  if (!routes) return null;

  const cards = (
    [
      { key: "FASTEST", route: routes.fastest },
      { key: "SHORTEST", route: routes.shortest },
      { key: "EASIEST", route: routes.easiest },
      { key: "ALTERNATIVE", route: routes.alternative },
    ] as Array<{ key: keyof typeof META; route?: RouteResult }>
  ).filter((c): c is { key: keyof typeof META; route: RouteResult } => Boolean(c.route));

  if (cards.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        No walkable route found between these locations.
      </Card>
    );
  }

  // Baseline duration for "vs fastest" comparison
  const fastestDuration = routes.fastest?.durationS ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 pb-1 border-b border-border/40">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
          {cards.length} Route{cards.length > 1 ? "s" : ""} Found
        </h3>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            tap to highlight
          </span>
          {fromSlug && toSlug && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onToggleBookmark}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark route"}
              >
                <Star className={cn("h-3.5 w-3.5", isBookmarked && "fill-amber-500 text-amber-500")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onShare}
                aria-label="Share route"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="grid gap-2">
        {cards.map(({ key, route }, idx) => {
          const meta = META[key];
          const Icon = meta.icon;
          const selected = selectedObjective === key;
          const qualityTags = deriveQualityTags(route.reason);
          // Apply weather impact factor to duration
          const adjustedDurationS = route.durationS / weatherImpactFactor;
          const deltaS = adjustedDurationS - fastestDuration;
          const isFastest = key === "FASTEST" || deltaS <= 0;

          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              disabled={journeyActive}
              className={cn(
                "group relative w-full overflow-hidden rounded-xl border bg-card p-3.5 text-left",
                "shadow-premium-1 transition-all duration-200",
                "hover-lift hover:shadow-premium-2 disabled:cursor-default disabled:hover:translate-y-0",
                // Subtle shimmer line that sweeps across on hover
                "after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-foreground/10 after:to-transparent after:opacity-0 after:transition-opacity hover:after:opacity-100",
                // Card enter animation
                "animate-card-enter",
                idx === 0 && "stagger-1",
                idx === 1 && "stagger-2",
                idx === 2 && "stagger-3",
                idx === 3 && "stagger-4",
                // Left accent border (4px)
                "border-l-4",
                selected ? meta.borderAccent : "border-l-transparent",
                // Selected: ring + gradient + glow
                selected
                  ? cn(meta.border, "ring-2", meta.ring, "bg-gradient-to-r", meta.gradient, "to-transparent")
                  : "border-border hover:border-foreground/20",
              )}
              style={selected ? { boxShadow: meta.glowShadow } : undefined}
            >
              {/* Header row: label + badges */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", meta.color)} />
                  <span className="text-sm font-semibold">{t(meta.labelKey)} Route</span>
                </div>
                <div className="flex items-center gap-1">
                  {isFastest && (
                    <Badge
                      className="badge-recommended gap-1 bg-emerald-100 text-[10px] text-emerald-800 ring-1 ring-emerald-300/40 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-700/40"
                      variant="secondary"
                    >
                      <Sparkles className="h-2.5 w-2.5 animate-pulse" />
                      Recommended
                    </Badge>
                  )}
                  {selected && (
                    <Badge
                      className={cn("text-[10px]", meta.badge)}
                      variant="secondary"
                    >
                      Selected
                    </Badge>
                  )}
                </div>
              </div>

              {/* Metrics row */}
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-xl font-bold tabular-nums">
                  {formatDistanceAuto(route.distanceM, units)}
                </span>
                <span className="flex items-center gap-1 text-sm font-medium tabular-nums text-foreground/80">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(adjustedDurationS)}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  ETA {formatEta(new Date(Date.now() + adjustedDurationS * 1000).toISOString())}
                </span>
                {/* Calorie estimate badge — uses mode-based MET lookup */}
                {(() => {
                  const kcal = estimateCalories(route.distanceM, route.durationS, route.mode);
                  return (
                    <span
                      className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100/70 px-2 py-0.5 text-[10px] font-medium text-amber-800 tabular-nums dark:bg-amber-950/40 dark:text-amber-300"
                      title="Estimated calories burned (65 kg reference weight, mode-based MET)"
                    >
                      <Flame className="h-2.5 w-2.5" />
                      {kcal} kcal
                    </span>
                  );
                })()}
              </div>

              {/* Weather impact note */}
              {weatherImpactFactor < 1.0 && (
                <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                  Weather-adjusted (×{weatherImpactFactor})
                </p>
              )}

              {/* Quality badges row */}
              {qualityTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {qualityTags.map((tag) => {
                    const TagIcon = tag.icon;
                    return (
                      <Badge
                        key={tag.label}
                        variant="secondary"
                        className={cn("gap-1 text-[10px] px-1.5 py-0", tag.className)}
                      >
                        <TagIcon className="h-2.5 w-2.5" />
                        {tag.label}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Reason text */}
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                {route.reason}
              </p>

              {/* Difficulty bar with gradient */}
              {typeof route.difficulty === "number" && (
                <div className="mt-2 flex items-center gap-1.5">
                  <TerrainIndicator difficulty={route.difficulty} />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
                        meta.diffGradient,
                      )}
                      style={{ width: `${Math.min(100, route.difficulty)}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {Math.round(route.difficulty)}/100
                  </span>
                </div>
              )}

              {/* "vs fastest" comparison line */}
              <p className="mt-1.5 text-[10px] tabular-nums text-muted-foreground/70">
                {formatVsFastest(deltaS, isFastest)}
              </p>

              {/* Elevation Profile mini-chart */}
              {showElevation &&
                typeof route.difficulty === "number" &&
                route.path.length >= 2 && (
                  <ElevationProfile
                    difficulty={route.difficulty}
                    pathCoords={route.path}
                    objective={key}
                  />
                )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
