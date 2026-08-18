"use client";

// DateBadge — a small calendar-style date indicator rendered in the top-left
// corner of each EventCard in the Events panel. The visual pattern is the
// classic "tear-off calendar" square: month abbreviation on the top half,
// large day-of-month on the bottom half, divided by a hairline border.
//
// Visual states:
//   • Default  — rose → amber gradient background, rose month text.
//   • Today    — adds a teal accent ring + an emerald CalendarCheck icon.
//   • Past     — muted bg + muted-foreground text (de-emphasised).
//
// The component takes an ISO 8601 timestamp (e.g. "2025-08-15T09:00:00")
// and renders client-side. Date math uses plain `new Date()` — no date lib.

import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateBadgeProps {
  /** ISO 8601 timestamp, e.g. "2025-08-15T09:00:00". */
  date: string;
  /** Badge size preset — `sm` shrinks the square for compact card layouts. */
  size?: "sm" | "md";
}

/* ── Plain `new Date()` helpers (no date library) ─────────────────────── */

/** True if the given date falls on the same calendar day as "today". */
export function isToday(date: string | Date): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** True if the given date is strictly in the past (millisecond comparison). */
export function isPast(date: string | Date): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getTime() < Date.now();
}

/** Short 3-letter English month abbreviation (JAN, FEB, …). */
function monthAbbr(d: Date): string {
  return d.toLocaleString("en-US", { month: "short" }).toUpperCase();
}

/* ── Component ────────────────────────────────────────────────────────── */

export function DateBadge({ date, size = "md" }: DateBadgeProps) {
  const d = new Date(date);
  const today = isToday(d);
  const past = !today && isPast(d);

  const dayNum = d.getDate();

  // Size mapping — keep the square aspect ratio roughly 6:7 (w:h) per brief.
  const dims =
    size === "sm"
      ? "h-12 w-10" // 48px × 40px
      : "h-14 w-12"; // 56px × 48px

  return (
    <div
      role="img"
      aria-label={`${monthAbbr(d)} ${dayNum}${today ? " (today)" : past ? " (past)" : ""}`}
      className={cn(
        "relative shrink-0 select-none overflow-hidden rounded-lg border text-center shadow-premium-1",
        dims,
        // Default (upcoming or no special state): rose→amber gradient
        !past &&
          !today &&
          "bg-gradient-to-br from-rose-50 to-amber-50 border-rose-200/60 dark:from-rose-950/30 dark:to-amber-950/20 dark:border-rose-900/40",
        // Past: muted, de-emphasised
        past &&
          "bg-muted text-muted-foreground border-border",
        // Today: teal accent ring (rose gradient bg still visible underneath)
        today && "ring-2 ring-teal-400/40",
      )}
    >
      {/* Month abbreviation (top half) */}
      <div
        className={cn(
          "flex items-center justify-center border-b border-border/60 px-0.5 pt-0.5 text-[10px] font-bold uppercase leading-none",
          past
            ? "text-muted-foreground"
            : "text-rose-600 dark:text-rose-400",
        )}
      >
        {monthAbbr(d)}
      </div>

      {/* Day-of-month (bottom half) */}
      <div
        className={cn(
          "flex items-center justify-center px-0.5 pb-0.5 text-2xl font-bold leading-none tabular-nums",
          past ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {dayNum}
      </div>

      {/* "Today" indicator icon — emerald CalendarCheck, top-right */}
      {today && (
        <CalendarCheck
          className="absolute right-0.5 top-0.5 h-3 w-3 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
