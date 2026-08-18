"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Navigation2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface SmartSuggestionData {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  reason: string;
  confidence: number;
}

interface SmartSuggestionsProps {
  suggestions: SmartSuggestionData[];
  loading: boolean;
  source: "llm" | "heuristic" | null;
  onSelect: (from: string, to: string) => void;
}

export function SmartSuggestions({
  suggestions,
  loading,
  source,
  onSelect,
}: SmartSuggestionsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/30 to-orange-50/20 p-4 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
          <span className="text-sm font-semibold">Smart Suggestions</span>
          <Badge variant="secondary" className="text-[9px]">
            AI
          </Badge>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!suggestions.length) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/30 to-orange-50/20 p-4 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500 animate-[spin_3s_linear_infinite]" />
          <span className="text-sm font-semibold">Smart Suggestions</span>
          <Badge
            variant="secondary"
            className={cn(
              "text-[9px]",
              source === "llm"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            )}
          >
            {source === "llm" ? "AI Enhanced" : "Smart"}
          </Badge>
        </div>

        <div className="space-y-2.5">
          {suggestions.map((s, i) => (
            <div
              key={`${s.from}-${s.to}-${i}`}
              className="group cursor-pointer rounded-lg border border-amber-200/40 bg-white/60 p-3 transition-all hover:border-amber-300/60 hover:bg-white/80 hover:shadow-sm dark:border-amber-800/30 dark:bg-slate-900/40 dark:hover:border-amber-700/50 dark:hover:bg-slate-900/60"
              onClick={() => onSelect(s.from, s.to)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(s.from, s.to);
              }}
            >
              {/* Route line */}
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Navigation2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="truncate">{s.fromName}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{s.toName}</span>
              </div>

              {/* Reason + confidence */}
              <div className="mt-1.5 flex items-center gap-2">
                <p className="flex-1 text-[11px] text-muted-foreground">
                  {s.reason}
                </p>
                {/* Confidence bar */}
                <div className="flex shrink-0 items-center gap-1">
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        s.confidence >= 0.8
                          ? "bg-emerald-500"
                          : s.confidence >= 0.6
                            ? "bg-amber-500"
                            : "bg-slate-400",
                      )}
                      style={{ width: `${s.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] tabular-nums text-muted-foreground">
                    {Math.round(s.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Expandable "Why?" tooltip */}
              <button
                className="mt-1.5 flex items-center gap-0.5 text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedIndex(expandedIndex === i ? null : i);
                }}
              >
                {expandedIndex === i ? (
                  <ChevronUp className="h-2.5 w-2.5" />
                ) : (
                  <ChevronDown className="h-2.5 w-2.5" />
                )}
                Why this suggestion?
              </button>
              {expandedIndex === i && (
                <div className="mt-1.5 rounded-md bg-amber-50/60 px-2.5 py-1.5 text-[10px] leading-snug text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  This suggestion is based on the current time of day, weather
                  conditions, and your recent navigation patterns on campus.
                  {source === "llm" &&
                    " Enhanced by AI analysis of campus traffic patterns."}
                  <br />
                  Confidence: {Math.round(s.confidence * 100)}% —{" "}
                  {s.confidence >= 0.8
                    ? "strong match"
                    : s.confidence >= 0.6
                      ? "moderate match"
                      : "low match"}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Tap a suggestion to auto-fill the route planner
        </p>
      </Card>
    </TooltipProvider>
  );
}
