"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LocateFixed,
  Search,
  Footprints,
  Gauge,
  Zap,
  ArrowDownUp,
  MapPin,
  Accessibility,
  Star,
  Clock,
  X,
  Plus,
  Settings2,
  ChevronDown,
  Sun,
  Umbrella,
  Users,
  Waypoints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CampusLocation } from "@/lib/api-client";
import { CATEGORY_LABELS } from "@/lib/routing/types";
import type { WalkingMode } from "@/lib/routing/types";
import { useTranslation, type TranslationKey } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/hooks/use-app-store";
import { cn } from "@/lib/utils";

interface PopularRoute {
  from: string;
  to: string;
  label: string;
}

interface BookmarkRoute {
  from: string;
  to: string;
  mode: WalkingMode;
  label: string;
}

interface RecentSearch {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  ts: number;
}

interface Props {
  locations: CampusLocation[];
  fromSlug: string | null;
  toSlug: string | null;
  useGpsOrigin: boolean;
  gpsSupported: boolean;
  gpsPermission: string;
  onFromChange: (slug: string) => void;
  onToChange: (slug: string) => void;
  onUseGpsOrigin: (b: boolean) => void;
  onLocateMe: () => void;
  onSwapFromTo: () => void;
  mode: WalkingMode;
  onModeChange: (m: WalkingMode) => void;
  accessibleOnly: boolean;
  onAccessibleOnlyChange: (b: boolean) => void;
  // Advanced options
  avoidShaded: boolean;
  preferSheltered: boolean;
  avoidCrowds: boolean;
  /** Ordered list of via-point location slugs (waypoints, up to 3).
   *  May contain empty strings as unselected placeholders. */
  viaPoints: string[];
  onAvoidShadedChange: (b: boolean) => void;
  onPreferShelteredChange: (b: boolean) => void;
  onAvoidCrowdsChange: (b: boolean) => void;
  /** Replace the entire via-points array (the planner clamps to 3). */
  onViaPointsChange: (slugs: string[]) => void;
  onCompute: () => void;
  onStartJourney: () => void;
  routesLoading: boolean;
  journeyActive: boolean;
  popularRoutes?: PopularRoute[];
  onQuickSelect?: (from: string, to: string) => void;
  bookmarks?: BookmarkRoute[];
  onRemoveBookmark?: (from: string, to: string) => void;
}

const MODE_META: Record<
  WalkingMode,
  {
    label: TranslationKey;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
    speed: string;
    color: string;
    gradient: string;
    borderActive: string;
  }
> = {
  RELAXED: {
    label: "label.relaxed",
    icon: Footprints,
    desc: "Stroll pace",
    speed: "~0.9 m/s",
    color: "text-emerald-600",
    gradient: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-950/20",
    borderActive: "border-emerald-400 dark:border-emerald-600",
  },
  NORMAL: {
    label: "label.normal",
    icon: Gauge,
    desc: "Default pace",
    speed: "~1.2 m/s",
    color: "text-teal-600",
    gradient: "from-teal-50 to-teal-100/50 dark:from-teal-950/40 dark:to-teal-950/20",
    borderActive: "border-teal-400 dark:border-teal-600",
  },
  HURRY: {
    label: "label.hurry",
    icon: Zap,
    desc: "Brisk walk",
    speed: "~1.6 m/s",
    color: "text-orange-600",
    gradient: "from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-950/20",
    borderActive: "border-orange-400 dark:border-orange-600",
  },
};

/* ── Recent searches localStorage helpers ── */
const RECENT_KEY = "iitgn-recent-searches";
const MAX_RECENT = 5;

function loadRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) return JSON.parse(raw) as RecentSearch[];
  } catch { /* ignore */ }
  return [];
}

function saveRecentSearches(searches: RecentSearch[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(searches));
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Searchable Location Combobox (Popover + Command)                   */
/* ------------------------------------------------------------------ */

function LocationCombobox({
  locations,
  grouped,
  value,
  onValueChange,
  placeholder,
  disabled,
  accentColor,
}: {
  locations: CampusLocation[];
  grouped: Array<{ category: string; items: CampusLocation[] }>;
  value: string | null;
  onValueChange: (slug: string) => void;
  placeholder: string;
  disabled?: boolean;
  accentColor: "green" | "red";
}) {
  const [open, setOpen] = useState(false);

  const selectedName = useMemo(
    () => (value ? locations.find((l) => l.slug === value)?.name ?? "" : ""),
    [value, locations],
  );

  const handleSelect = useCallback(
    (slug: string) => {
      onValueChange(slug);
      setOpen(false);
    },
    [onValueChange],
  );

  const borderColor = accentColor === "green"
    ? "border-l-emerald-500 dark:border-l-emerald-400"
    : "border-l-rose-500 dark:border-l-rose-400";

  return (
    <div className={cn("border-l-[3px]", borderColor, "rounded-lg")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-between truncate rounded-lg font-normal pl-3",
              !value && "text-muted-foreground",
            )}
          >
            <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {value ? selectedName || value : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter>
            <CommandInput placeholder="Search locations…" />
            <CommandList>
              <CommandEmpty>No location found.</CommandEmpty>
              {grouped.map((g) => (
                <CommandGroup
                  key={g.category}
                  heading={CATEGORY_LABELS[g.category] ?? g.category}
                >
                  {g.items.map((l) => (
                    <CommandItem
                      key={l.slug}
                      value={l.slug}
                      keywords={[l.name, l.category]}
                      onSelect={() => handleSelect(l.slug)}
                      className={cn(
                        "cursor-pointer",
                        value === l.slug &&
                          "bg-accent text-accent-foreground",
                      )}
                    >
                      <MapPin
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          value === l.slug
                            ? "text-teal-600"
                            : "text-muted-foreground",
                        )}
                      />
                      <span>{l.name}</span>
                      {value === l.slug && (
                        <span className="ml-auto text-xs text-teal-600">
                          ✓
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Via-point combobox — similar but allows null + shows "no via"     */
/* ------------------------------------------------------------------ */

function ViaPointCombobox({
  locations,
  grouped,
  value,
  onValueChange,
  disabled,
  excludeSlugs = [],
}: {
  locations: CampusLocation[];
  grouped: Array<{ category: string; items: CampusLocation[] }>;
  value: string | null;
  onValueChange: (slug: string | null) => void;
  disabled?: boolean;
  excludeSlugs?: string[];
}) {
  const [open, setOpen] = useState(false);
  const excludeSet = useMemo(() => new Set(excludeSlugs), [excludeSlugs]);

  const selectedName = useMemo(
    () => (value ? locations.find((l) => l.slug === value)?.name ?? "" : ""),
    [value, locations],
  );

  const handleSelect = useCallback(
    (slug: string | null) => {
      onValueChange(slug);
      setOpen(false);
    },
    [onValueChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-between truncate rounded-lg text-xs font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-1.5">
            <Waypoints className="h-3 w-3 shrink-0 text-muted-foreground" />
            {value ? selectedName || value : "No via point"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Search via point…" />
          <CommandList>
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => handleSelect(null)}
                className="cursor-pointer"
              >
                <X className="mr-2 h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Clear via point</span>
              </CommandItem>
            </CommandGroup>
            {grouped.map((g) => {
              const items = g.items.filter((l) => !excludeSet.has(l.slug));
              if (items.length === 0) return null;
              return (
                <CommandGroup
                  key={g.category}
                  heading={CATEGORY_LABELS[g.category] ?? g.category}
                >
                  {items.map((l) => (
                    <CommandItem
                      key={l.slug}
                      value={l.slug}
                      keywords={[l.name, l.category]}
                      onSelect={() => handleSelect(l.slug)}
                      className={cn(
                        "cursor-pointer",
                        value === l.slug && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Waypoints
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          value === l.slug
                            ? "text-teal-600"
                            : "text-muted-foreground",
                        )}
                      />
                      <span>{l.name}</span>
                      {value === l.slug && (
                        <span className="ml-auto text-xs text-teal-600">✓</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  Multi-waypoint editor — shows 1..3 ViaPointComboboxes with add /    */
/*  remove buttons so users can plan Hostel→Library→Dining→AB1 trips.   */
/* ------------------------------------------------------------------ */

const MAX_VIA_POINTS = 3;

function ViaPointsEditor({
  locations,
  grouped,
  viaPoints,
  onViaPointsChange,
  disabled,
  excludeSlugs = [],
}: {
  locations: CampusLocation[];
  grouped: Array<{ category: string; items: CampusLocation[] }>;
  viaPoints: string[];
  onViaPointsChange: (slugs: string[]) => void;
  disabled?: boolean;
  excludeSlugs?: string[];
}) {
  // Always render at least one row so the empty state is a clear affordance;
  // pad with a synthetic "" placeholder when the store has nothing yet.
  const rows: string[] =
    viaPoints.length === 0 ? [""] : viaPoints.slice(0, MAX_VIA_POINTS);
  const showRemoveButton = rows.length > 1;

  const handleRowChange = (index: number, slug: string | null) => {
    // Always work from the stored array; if the user is editing the
    // placeholder row (viaPoints.length === 0), seed with [""] so index 0
    // is real before mutating.
    const next = viaPoints.length === 0 ? [""] : viaPoints.slice();
    while (next.length < MAX_VIA_POINTS && next.length <= index) {
      next.push("");
    }
    if (slug === null) {
      // "Clear via point" inside the combobox → remove this row entirely.
      next.splice(index, 1);
    } else {
      next[index] = slug;
    }
    onViaPointsChange(next);
  };

  const handleRemove = (index: number) => {
    const next = viaPoints.slice();
    next.splice(index, 1);
    onViaPointsChange(next);
  };

  const handleAdd = () => {
    // When the array is empty we are showing a single placeholder row; "Add
    // waypoint" should make that placeholder real AND append a new empty row
    // so the user sees the row count visibly grow.
    const base = viaPoints.length === 0 ? [""] : viaPoints;
    if (base.length >= MAX_VIA_POINTS) return;
    onViaPointsChange([...base, ""]);
  };

  return (
    <div className="pt-1">
      <div className="mb-1.5 flex items-center justify-between">
        <Label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Waypoints className="mr-1 inline h-2.5 w-2.5" />
          Via points (optional, max {MAX_VIA_POINTS})
        </Label>
        {rows.some((v) => v) && (
          <button
            type="button"
            onClick={() => onViaPointsChange([])}
            disabled={disabled}
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-2.5 w-2.5" /> Clear all
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {rows.map((slug, idx) => {
          // Exclude the start/goal plus the slugs chosen in OTHER rows so the
          // same waypoint can't appear twice.
          const otherSlugs = rows
            .map((s, i) => (i === idx ? "" : s))
            .filter(Boolean);
          return (
            <div
              key={idx}
              className="flex items-center gap-1.5"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                aria-hidden="true"
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <ViaPointCombobox
                  locations={locations}
                  grouped={grouped}
                  value={slug || null}
                  onValueChange={(s) => handleRowChange(idx, s)}
                  disabled={disabled}
                  excludeSlugs={[...excludeSlugs, ...otherSlugs]}
                />
              </div>
              {showRemoveButton && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleRemove(idx)}
                  disabled={disabled}
                  aria-label={`Remove waypoint ${idx + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {rows.length < MAX_VIA_POINTS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-7 w-full gap-1.5 text-xs"
          onClick={handleAdd}
          disabled={disabled}
        >
          <Plus className="h-3 w-3" />
          Add waypoint
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main RoutePlanner Component                                       */
/* ------------------------------------------------------------------ */

export function RoutePlanner({
  locations,
  fromSlug,
  toSlug,
  useGpsOrigin,
  gpsSupported,
  gpsPermission,
  onFromChange,
  onToChange,
  onUseGpsOrigin,
  onLocateMe,
  onSwapFromTo,
  mode,
  onModeChange,
  accessibleOnly,
  onAccessibleOnlyChange,
  avoidShaded,
  preferSheltered,
  avoidCrowds,
  viaPoints,
  onAvoidShadedChange,
  onPreferShelteredChange,
  onAvoidCrowdsChange,
  onViaPointsChange,
  onCompute,
  onStartJourney,
  routesLoading,
  journeyActive,
  popularRoutes,
  onQuickSelect,
  bookmarks,
  onRemoveBookmark,
}: Props) {
  const { t } = useTranslation();
  const grouped = useMemo(() => {
    const m = new Map<string, CampusLocation[]>();
    for (const l of locations) {
      const arr = m.get(l.category) ?? [];
      arr.push(l);
      m.set(l.category, arr);
    }
    const order = [
      "HOSTEL",
      "ACADEMIC",
      "CLASSROOM",
      "LAB",
      "LIBRARY",
      "DINING",
      "SPORTS",
      "ADMIN",
      "GATE",
      "LANDMARK",
      "OTHER",
    ];
    return order
      .filter((c) => m.has(c))
      .map((c) => ({ category: c, items: m.get(c)! }));
  }, [locations]);

  const canCompute =
    (useGpsOrigin || !!fromSlug) && !!toSlug && !journeyActive;

  const isInitialState = !fromSlug && !toSlug && !useGpsOrigin;

  /* ── Favorites (starred locations) — read directly from the global store
     so the planner re-renders immediately when a star is toggled anywhere
     in the app (e.g. from the POI popup). Selector hooks avoid unnecessary
     re-renders when unrelated store slices change. ── */
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  // Map favorited slugs → CampusLocation objects (preserving favorites order).
  // Stale slugs (e.g. from an old localStorage entry whose seed was renamed)
  // are silently filtered out — the store's `toggleFavorite` already validates
  // on write, so this is just a defensive read-time filter.
  const favLocations = useMemo(
    () =>
      favorites
        .map((slug) => locations.find((l) => l.slug === slug))
        .filter((l): l is CampusLocation => Boolean(l)),
    [favorites, locations],
  );

  /* ── Recent searches ── */
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => loadRecentSearches());

  // Save a new recent search when both from and to are set and a compute happens
  const addRecentSearch = useCallback(() => {
    if (!fromSlug || !toSlug) return;
    const fromName = locations.find((l) => l.slug === fromSlug)?.name ?? fromSlug;
    const toName = locations.find((l) => l.slug === toSlug)?.name ?? toSlug;
    setRecentSearches((prev) => {
      // Remove duplicate
      const filtered = prev.filter(
        (r) => !(r.from === fromSlug && r.to === toSlug),
      );
      const next = [
        { from: fromSlug, to: toSlug, fromName, toName, ts: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);
      saveRecentSearches(next);
      return next;
    });
  }, [fromSlug, toSlug, locations]);

  // Wrap onCompute to also record the search
  const handleCompute = useCallback(() => {
    addRecentSearch();
    onCompute();
  }, [addRecentSearch, onCompute]);

  const handleRecentSelect = useCallback(
    (rs: RecentSearch) => {
      onFromChange(rs.from);
      onToChange(rs.to);
    },
    [onFromChange, onToChange],
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveRecentSearches([]);
  }, []);

  return (
    <div className="space-y-4">
      {/* From selector with green accent */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            {t("label.from")}
          </Label>
          <Button
            type="button"
            variant={useGpsOrigin ? "default" : "outline"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              onUseGpsOrigin(!useGpsOrigin);
              if (!useGpsOrigin) onLocateMe();
            }}
            disabled={!gpsSupported || journeyActive}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {useGpsOrigin ? "Using GPS" : "Use GPS"}
          </Button>
        </div>
        {useGpsOrigin ? (
          <div className="flex h-10 items-center rounded-lg border border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400 border-input bg-emerald-50/30 px-3 text-sm dark:bg-emerald-950/20">
            <LocateFixed className="mr-2 h-4 w-4 text-emerald-600" />
            <span className="text-foreground">Current location (GPS)</span>
            {gpsPermission === "denied" && (
              <Badge variant="destructive" className="ml-auto">
                denied
              </Badge>
            )}
          </div>
        ) : (
          <LocationCombobox
            locations={locations}
            grouped={grouped}
            value={fromSlug}
            onValueChange={onFromChange}
            placeholder="Select start location"
            disabled={journeyActive}
            accentColor="green"
          />
        )}
      </div>

      {/* Swap From/To button */}
      <div className="flex items-center justify-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full border-dashed transition-transform duration-300 hover:rotate-180 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30",
          )}
          onClick={onSwapFromTo}
          disabled={journeyActive || (!fromSlug && !useGpsOrigin && !toSlug)}
          aria-label="Swap from and to"
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* To selector with red accent */}
      <div>
        <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
          {t("label.to")}
        </Label>
        <LocationCombobox
          locations={locations}
          grouped={grouped}
          value={toSlug}
          onValueChange={onToChange}
          placeholder="Select destination"
          disabled={journeyActive}
          accentColor="red"
        />
      </div>

      {/* Walking Mode with gradient and speed indicator */}
      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("label.walkingMode")}
        </Label>
        <RadioGroup
          value={mode}
          onValueChange={(v) =>
            onModeChange(v as WalkingMode)
          }
          className="grid grid-cols-3 gap-2"
          disabled={journeyActive}
        >
          {(
            Object.keys(MODE_META) as Array<keyof typeof MODE_META>
          ).map((k) => {
            const m = MODE_META[k];
            const Icon = m.icon;
            const isActive = mode === k;
            return (
              <Label
                key={k}
                htmlFor={`mode-${k}`}
                className={cn(
                  "hover-lift flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all duration-200",
                  isActive
                    ? cn("bg-gradient-to-br", m.gradient, m.borderActive, "shadow-premium-2")
                    : "hover:bg-accent border-border hover:shadow-premium-1",
                )}
              >
                <RadioGroupItem
                  value={k}
                  id={`mode-${k}`}
                  className="sr-only"
                />
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? m.color : "text-muted-foreground",
                  )}
                />
                <span className="text-xs font-medium">
                  {t(m.label)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {m.desc}
                </span>
                {isActive && (
                  <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[9px] font-mono tabular-nums text-muted-foreground dark:bg-background/30">
                    {m.speed}
                  </span>
                )}
              </Label>
            );
          })}
        </RadioGroup>
      </div>

      {/* Accessibility toggle — premium rounded-xl with violet gradient accent */}
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-gradient-to-r from-violet-50/40 to-purple-50/20 px-3 py-2.5 shadow-premium-1 transition-shadow hover:shadow-premium-2 dark:from-violet-950/20 dark:to-purple-950/10">
        <div className="flex items-center gap-2">
          <Accessibility className="h-4 w-4 text-violet-600" />
          <div>
            <span className="text-xs font-medium">Accessible routes only</span>
            <p className="text-[10px] text-muted-foreground">Avoids stairs &amp; unpaved paths</p>
          </div>
        </div>
        <Switch
          checked={accessibleOnly}
          onCheckedChange={onAccessibleOnlyChange}
          disabled={journeyActive}
          aria-label="Accessible routes only"
        />
      </div>

      {/* Advanced options (collapsible) */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full justify-between gap-1.5 text-xs font-medium"
            disabled={journeyActive}
          >
            <span className="flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              Advanced options
              {(avoidShaded ||
                preferSheltered ||
                avoidCrowds ||
                viaPoints.some((v) => v)) && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 px-1.5 text-[9px] tabular-nums text-teal-700 dark:text-teal-300"
                >
                  {[
                    avoidShaded,
                    preferSheltered,
                    avoidCrowds,
                    ...viaPoints.map((v) => Boolean(v)),
                  ].filter(Boolean).length}{" "}
                  active
                </Badge>
              )}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [[data-state='open']_&]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2 rounded-lg border bg-muted/20 p-3">
          {/* Avoid shaded areas */}
          <label
            htmlFor="opt-avoid-shaded"
            className="flex cursor-pointer items-start gap-2.5"
          >
            <Checkbox
              id="opt-avoid-shaded"
              checked={avoidShaded}
              onCheckedChange={(v) => onAvoidShadedChange(v === true)}
              disabled={journeyActive}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs font-medium">
                <Sun className="h-3 w-3 text-amber-600" />
                Avoid shaded areas
              </div>
              <p className="text-[10px] text-muted-foreground">
                Penalise paths with no or partial lighting.
              </p>
            </div>
          </label>

          {/* Prefer sheltered paths */}
          <label
            htmlFor="opt-prefer-sheltered"
            className="flex cursor-pointer items-start gap-2.5"
          >
            <Checkbox
              id="opt-prefer-sheltered"
              checked={preferSheltered}
              onCheckedChange={(v) => onPreferShelteredChange(v === true)}
              disabled={journeyActive}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs font-medium">
                <Umbrella className="h-3 w-3 text-teal-600" />
                Prefer sheltered paths
              </div>
              <p className="text-[10px] text-muted-foreground">
                Boost edges marked well-lit (covered or tree-lined).
              </p>
            </div>
          </label>

          {/* Avoid crowds */}
          <label
            htmlFor="opt-avoid-crowds"
            className="flex cursor-pointer items-start gap-2.5"
          >
            <Checkbox
              id="opt-avoid-crowds"
              checked={avoidCrowds}
              onCheckedChange={(v) => onAvoidCrowdsChange(v === true)}
              disabled={journeyActive}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs font-medium">
                <Users className="h-3 w-3 text-sky-600" />
                Avoid crowds
              </div>
              <p className="text-[10px] text-muted-foreground">
                Prefer low-traffic edges during peak hours.
              </p>
            </div>
          </label>

          {/* Via points (multi-waypoint, up to 3) */}
          <ViaPointsEditor
            locations={locations}
            grouped={grouped}
            viaPoints={viaPoints}
            onViaPointsChange={onViaPointsChange}
            disabled={journeyActive}
            excludeSlugs={
              useGpsOrigin
                ? [toSlug ?? ""].filter(Boolean)
                : [fromSlug ?? "", toSlug ?? ""].filter(Boolean)
            }
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Bookmarked Routes Quick-Select */}
      {bookmarks && bookmarks.length > 0 && (
        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            <Star className="mr-1 inline h-3 w-3" />
            Bookmarked
          </Label>
          <div className="flex flex-wrap gap-2">
            {bookmarks.slice(0, 4).map((bm) => (
              <Badge
                key={`${bm.from}-${bm.to}`}
                variant="secondary"
                className="group cursor-pointer gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 hover:scale-105 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950 dark:hover:text-amber-300"
                onClick={() => onQuickSelect?.(bm.from, bm.to)}
              >
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {bm.label}
                {onRemoveBookmark && (
                  <button
                    className="ml-0.5 hidden text-muted-foreground hover:text-destructive group-hover:inline"
                    onClick={(e) => { e.stopPropagation(); onRemoveBookmark(bm.from, bm.to); }}
                    aria-label="Remove bookmark"
                  >
                    ×
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              Recent
            </Label>
            <button
              onClick={clearRecentSearches}
              className="text-[10px] text-muted-foreground hover:text-foreground"
              aria-label="Clear recent searches"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((rs) => (
              <Badge
                key={`${rs.from}-${rs.to}-${rs.ts}`}
                variant="secondary"
                className="group max-w-full min-w-0 cursor-pointer gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 hover:scale-105 hover:bg-teal-50 hover:text-teal-800 dark:hover:bg-teal-950 dark:hover:text-teal-300"
                onClick={() => handleRecentSelect(rs)}
              >
                <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {rs.fromName} → {rs.toName}
                </span>
                <button
                  className="ml-0.5 hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:inline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRecentSearches((prev) => {
                      const next = prev.filter(
                        (r) => !(r.from === rs.from && r.to === rs.to),
                      );
                      saveRecentSearches(next);
                      return next;
                    });
                  }}
                  aria-label="Remove recent search"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Favorites (starred locations) Quick-Select — horizontal scroll of
          amber pill chips. Always visible: shows an empty-state hint when
          the user has no favorites yet so they learn where to add them.
          Visually distinct from Popular Routes (amber vs teal) and from
          Bookmarked Routes (also amber but Bookmarks wrap to a new row
          while Favorites scroll horizontally so long names don't crowd). */}
      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          <Star className="mr-1 inline h-3 w-3" />
          Favorites
        </Label>
        {favLocations.length > 0 ? (
          <div
            className="favorites-scroll flex gap-2 overflow-x-auto pb-1"
            role="list"
            aria-label="Favorite locations"
          >
            {favLocations.map((loc) => (
              <Badge
                key={loc.slug}
                variant="outline"
                role="button"
                tabIndex={0}
                aria-label={`Set ${loc.name} as destination`}
                onClick={() => onToChange(loc.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToChange(loc.slug);
                  }
                }}
                className="group animate-fade-in shrink-0 cursor-pointer gap-1.5 border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 transition-all duration-200 hover:scale-105 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/50"
              >
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span className="max-w-[10rem] truncate">{loc.name}</span>
                <button
                  type="button"
                  className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-amber-700/70 transition-colors hover:bg-amber-200/70 hover:text-amber-900 dark:text-amber-300/70 dark:hover:bg-amber-900/60 dark:hover:text-amber-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(loc.slug);
                  }}
                  aria-label={`Remove ${loc.name} from favorites`}
                  title={`Remove ${loc.name} from favorites`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-[10px] italic text-muted-foreground">
            Star a location from its popup to add it here
          </p>
        )}
      </div>

      {/* Popular Routes Quick-Select */}
      {isInitialState &&
        popularRoutes &&
        popularRoutes.length > 0 &&
        onQuickSelect && (
          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Popular Routes
            </Label>
            <div className="flex flex-wrap gap-2">
              {popularRoutes.slice(0, 3).map((pr, idx) => (
                <Badge
                  key={`${pr.from}-${pr.to}`}
                  variant="secondary"
                  style={{ "--chip-idx": idx } as React.CSSProperties}
                  className="chip-ambient group max-w-full min-w-0 cursor-pointer gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 hover:scale-105 hover:bg-teal-100 hover:text-teal-800 dark:hover:bg-teal-950 dark:hover:text-teal-300"
                  onClick={() => onQuickSelect(pr.from, pr.to)}
                >
                  <Footprints className="h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />
                  <span className="truncate">{pr.label}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleCompute}
          disabled={!canCompute || routesLoading}
          variant="secondary"
          className="flex-1 gap-1.5"
        >
          <Search className="h-4 w-4" />
          {routesLoading ? "Computing…" : t("label.findRoutes")}
        </Button>
        <Button
          onClick={onStartJourney}
          disabled={!canCompute || routesLoading}
          className="cta-pulse flex-1 gap-1.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800"
        >
          <Footprints className="h-4 w-4" />
          {t("label.startJourney")}
        </Button>
      </div>
    </div>
  );
}
