"use client";

// Dismissible, auto-rotating campus announcements banner.
//
// Loads the active announcements on mount, then cycles through them every 5s.
// High-priority announcements get a red left border + pulsing dot.
// Dismissed IDs are stored in localStorage (`iitgn-dismissed-announcements`)
// and persist for the browser session.

import { useEffect, useMemo, useState, useCallback } from "react";
import { api, type Announcement } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronDown,
  ChevronUp,
  Megaphone,
  CalendarDays,
  Wrench,
  CloudRain,
  GraduationCap,
  AlertCircle,
  Info,
} from "lucide-react";

const DISMISS_KEY = "iitgn-dismissed-announcements";
const ROTATE_MS = 5000;

/* ── Category metadata ──────────────────────────────────────────────── */

const CATEGORY_META: Record<
  Announcement["category"],
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  EVENT: { icon: CalendarDays, label: "Event" },
  MAINTENANCE: { icon: Wrench, label: "Maintenance" },
  WEATHER: { icon: CloudRain, label: "Weather" },
  ACADEMIC: { icon: GraduationCap, label: "Academic" },
};

/* ── localStorage helpers ───────────────────────────────────────────── */

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveDismissed(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify([...ids]),
    );
  } catch {
    /* ignore */
  }
}

/* ── Component ──────────────────────────────────────────────────────── */

export function AnnouncementsBanner() {
  // Lazy initialisers: read localStorage once on the client. Server renders
  // an empty banner (loading=true, visible.length===0 → returns null), so
  // hydration is safe.
  const [all, setAll] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    typeof window !== "undefined" ? loadDismissed() : new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Load announcements once on mount.
  useEffect(() => {
    let cancelled = false;
    api
      .announcements()
      .then((res) => {
        if (cancelled) return;
        setAll(res.announcements ?? []);
      })
      .catch(() => {
        /* silent fail — banner is non-critical */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter dismissed.
  const visible = useMemo(
    () => all.filter((a) => !dismissed.has(a.id)),
    [all, dismissed],
  );

  // Derive the safe current index inline — never let it exceed visible.length.
  const safeIdx =
    visible.length === 0 ? 0 : currentIdx % visible.length;

  // Auto-rotate every 5 seconds (only when collapsed).
  useEffect(() => {
    if (visible.length <= 1 || expanded) return;
    const t = window.setInterval(() => {
      setCurrentIdx((i) => (i + 1) % visible.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [visible.length, expanded]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
    setCurrentIdx(0);
  }, []);

  const handleDismissAll = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const a of visible) next.add(a.id);
      saveDismissed(next);
      return next;
    });
    setCurrentIdx(0);
  }, [visible]);

  if (loading || visible.length === 0) return null;

  const current = visible[safeIdx] ?? visible[0];
  if (!current) return null;

  const catMeta = CATEGORY_META[current.category];
  const CatIcon = catMeta.icon;
  const isHigh = current.priority === "HIGH";
  const isMedium = current.priority === "MEDIUM";

  return (
    <div
      className={cn(
        "relative z-20 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60",
        isHigh
          ? "border-l-4 border-l-rose-500 dark:border-l-rose-400"
          : isMedium
            ? "border-l-4 border-l-amber-500 dark:border-l-amber-400"
            : "border-l-4 border-l-teal-500 dark:border-l-teal-400",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl items-stretch gap-2 px-3 py-1.5 sm:px-4">
        {/* Megaphone icon + counter */}
        <div className="flex items-center gap-1.5 pr-2">
          <Megaphone
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isHigh ? "text-rose-600 dark:text-rose-400" : "text-teal-600 dark:text-teal-400",
            )}
          />
          {isHigh && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
          )}
          {visible.length > 1 && (
            <span className="hidden text-[10px] font-mono tabular-nums text-muted-foreground sm:inline">
              {safeIdx + 1}/{visible.length}
            </span>
          )}
        </div>

        {/* Clickable content area: cycles to next on click */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          {/* Collapsed view */}
          {!expanded && (
            <div className="flex items-center gap-2">
              <Badge2
                className={cn(
                  "shrink-0 gap-1 px-1.5 py-0 text-[10px] font-medium",
                  isHigh
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : isMedium
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
                )}
              >
                <CatIcon className="h-2.5 w-2.5" />
                <span className="hidden sm:inline">{catMeta.label}</span>
              </Badge2>
              <p className="truncate text-xs font-medium text-foreground">
                {current.title}
              </p>
              <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
            </div>
          )}

          {/* Expanded view */}
          {expanded && (
            <div className="animate-fade-in py-1">
              <div className="flex items-center gap-2">
                <Badge2
                  className={cn(
                    "shrink-0 gap-1 px-1.5 py-0 text-[10px] font-medium",
                    isHigh
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : isMedium
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
                  )}
                >
                  <CatIcon className="h-2.5 w-2.5" />
                  {catMeta.label}
                </Badge2>
                <p className="flex-1 text-xs font-semibold text-foreground">
                  {current.title}
                </p>
                <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {current.body}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {isHigh && (
                  <span className="mr-1 inline-flex items-center gap-0.5 font-medium text-rose-600 dark:text-rose-400">
                    <AlertCircle className="h-2.5 w-2.5" />
                    High priority
                  </span>
                )}
                {!isHigh && isMedium && (
                  <span className="mr-1 inline-flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400">
                    <Info className="h-2.5 w-2.5" />
                    Medium priority
                  </span>
                )}
                Posted {new Date(current.postedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}
        </button>

        {/* Dismiss controls */}
        <div className="flex shrink-0 items-center gap-0.5">
          {visible.length > 1 && (
            <button
              type="button"
              onClick={handleDismissAll}
              className="hidden rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline"
              aria-label="Dismiss all announcements"
            >
              Dismiss all
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDismiss(current.id)}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Dismiss this announcement"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress dots for non-expanded state */}
      {!expanded && visible.length > 1 && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center gap-1 pb-px">
          {visible.map((a, i) => (
            <span
              key={a.id}
              className={cn(
                "h-0.5 rounded-full transition-all duration-300",
                i === safeIdx
                  ? "w-4 bg-foreground/40"
                  : "w-1.5 bg-foreground/15",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tiny inline Badge so we don't depend on a separate import ───────── */

function Badge2({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}
