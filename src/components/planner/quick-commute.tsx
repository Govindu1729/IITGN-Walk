"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  BookOpen,
  UtensilsCrossed,
  Dumbbell,
  Moon,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import {
  getCommuteSuggestions,
  getTimeContext,
  TIME_CONTEXT_LABEL,
  type CommuteSuggestion,
} from "@/lib/campus/commute";

// ─── Icon mapping ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<CommuteSuggestion["icon"], React.ReactNode> = {
  class: <GraduationCap className="h-3 w-3" />,
  dining: <UtensilsCrossed className="h-3 w-3" />,
  study: <BookOpen className="h-3 w-3" />,
  sports: <Dumbbell className="h-3 w-3" />,
  night: <Moon className="h-3 w-3" />,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuickCommuteProps {
  /** Called when a user selects a commute suggestion. */
  onSelect: (fromSlug: string, toSlug: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickCommute({ onSelect }: QuickCommuteProps) {
  const [hour, setHour] = useState(() => new Date().getHours());

  // Refresh hour every 60 minutes so suggestions stay current
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 3_600_000);
    return () => clearInterval(id);
  }, []);

  const suggestions = getCommuteSuggestions(hour);
  const ctx = getTimeContext(hour);
  const ctxMeta = TIME_CONTEXT_LABEL[ctx];

  const handleSelect = useCallback(
    (s: CommuteSuggestion) => {
      onSelect(s.fromSlug, s.toSlug);
    },
    [onSelect],
  );

  return (
    <div className="rounded-xl border border-teal-200/50 bg-gradient-to-br from-teal-50/40 to-emerald-50/30 p-3 shadow-premium-1 dark:border-teal-800/30 dark:from-teal-950/20 dark:to-emerald-950/10">
      {/* Header */}
      <div className="mb-2 flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
        <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
          Quick Commute
        </span>
        {/* Time-context badge */}
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-teal-100/60 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
          <span>{ctxMeta.emoji}</span>
          <span>{ctxMeta.label}</span>
        </span>
      </div>

      {/* Suggestion chips — horizontally scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {suggestions.map((s) => (
          <button
            key={`${s.fromSlug}-${s.toSlug}`}
            type="button"
            onClick={() => handleSelect(s)}
            className="group flex shrink-0 items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50/50 px-3 py-1.5 text-[11px] text-teal-700 transition-all duration-200 hover:bg-teal-100 hover:border-teal-300/60 hover:shadow-premium-1 active:scale-[0.97] dark:border-teal-800/40 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:bg-teal-900/40 dark:hover:border-teal-700/50"
          >
            {/* Contextual icon */}
            <span className="shrink-0 text-teal-500 dark:text-teal-400">
              {ICON_MAP[s.icon]}
            </span>
            {/* Route label — use visible → separator with proper spacing */}
            <span className="flex min-w-0 max-w-[160px] items-center gap-0.5 font-medium">
              <span className="truncate">{s.fromLabel}</span>
              <ArrowRight className="mx-0.5 h-3 w-3 shrink-0 text-teal-500 dark:text-teal-400" aria-hidden="true" />
              <span className="truncate">{s.toLabel}</span>
            </span>
            {/* Reason */}
            <span className="shrink-0 text-teal-500/70 dark:text-teal-400/60">
              · {s.reason}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
