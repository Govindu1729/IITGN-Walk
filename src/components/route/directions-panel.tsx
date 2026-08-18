"use client";

import { useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DirectionStep, Maneuver } from "@/lib/routing/types";
import { formatDistance } from "@/lib/geo/geo";
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  CornerLeftDown,
  CornerRightDown,
  Footprints,
  ChevronRight,
  ArrowDownUp,
} from "lucide-react";

interface Props {
  steps: DirectionStep[];
  activeStep?: number;
  onStepClick?: (idx: number) => void;
  onActiveStepChange?: (idx: number) => void;
  journeyActive?: boolean;
}

const ICONS: Record<Maneuver, React.ComponentType<{ className?: string }>> = {
  DEPART: ArrowUp,
  CONTINUE: ArrowUp,
  TURN_LEFT: CornerLeftDown,
  TURN_RIGHT: CornerRightDown,
  SHARP_LEFT: ArrowDownLeft,
  SHARP_RIGHT: ArrowDownRight,
  SLIGHT_LEFT: ArrowUpLeft,
  SLIGHT_RIGHT: ArrowUpRight,
  STAIRS: ArrowDownUp,
  ARRIVE: Footprints,
};

const MANEUVER_COLOR: Record<Maneuver, string> = {
  DEPART: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CONTINUE: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  TURN_LEFT: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  TURN_RIGHT: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  SHARP_LEFT: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  SHARP_RIGHT: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  SLIGHT_LEFT: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  SLIGHT_RIGHT: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  STAIRS: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  ARRIVE: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function DirectionsPanel({
  steps,
  activeStep,
  onStepClick,
  onActiveStepChange,
  journeyActive = false,
}: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Smooth scroll to bring the active step into view
  useEffect(() => {
    if (activeStep !== undefined && stepRefs.current[activeStep]) {
      stepRefs.current[activeStep]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeStep]);

  const handleNextStep = useCallback(() => {
    if (activeStep === undefined) {
      onActiveStepChange?.(0);
    } else if (steps && activeStep < steps.length - 1) {
      onActiveStepChange?.(activeStep + 1);
    }
  }, [activeStep, steps, onActiveStepChange]);

  if (!steps || steps.length === 0) return null;

  const currentStep = activeStep !== undefined ? steps[activeStep] : null;
  const CurrentIcon = currentStep ? ICONS[currentStep.maneuver] : null;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b bg-muted/40 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Footprints className="h-4 w-4 text-teal-600" />
          Turn-by-turn
          <span className="ml-auto text-[10px] font-normal text-muted-foreground">
            {steps.length} steps · tap to zoom on map
          </span>
        </h3>
      </div>

      {/* Active step instruction overlay */}
      {currentStep && (
        <div className="border-b bg-teal-50/50 dark:bg-teal-950/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-white shadow-md ring-2 ring-teal-400/50 animate-pulse">
                {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">
                Step {activeStep! + 1}
              </p>
              <p className="text-sm font-medium leading-snug text-foreground">
                {currentStep.instruction}
              </p>
              {currentStep.distanceM > 0 && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatDistance(currentStep.distanceM)}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={handleNextStep}
              disabled={activeStep === steps.length - 1}
            >
              <ChevronRight className="h-3 w-3" />
              {activeStep === steps.length - 1 ? "Last step" : "Next Step"}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {activeStep! + 1} of {steps.length}
            </span>
          </div>
        </div>
      )}

      <ol ref={listRef} className="max-h-[340px] overflow-y-auto p-1.5">
        {steps.map((s, i) => {
          const Icon = ICONS[s.maneuver];
          const isActive = activeStep === i;
          const isLast = i === steps.length - 1;
          const isPast = activeStep !== undefined && i < activeStep;
          return (
            <li
              key={i}
              ref={(el) => { stepRefs.current[i] = el; }}
              className="relative"
            >
              {onStepClick && (
                <button
                  onClick={() => {
                    onStepClick(i);
                    onActiveStepChange?.(i);
                  }}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent",
                    isActive && "bg-teal-50/60 ring-1 ring-teal-500/30 dark:bg-teal-950/30",
                    isPast && "opacity-60",
                  )}
                >
                  <div className="relative flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        MANEUVER_COLOR[s.maneuver],
                        isActive && "scale-110 ring-2 ring-teal-500/40 transition-transform",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {/* Pulsing indicator for active step */}
                    {isActive && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-500" />
                      </span>
                    )}
                    {!isLast && (
                      <span className={cn(
                        "mt-0.5 w-px flex-1 bg-gradient-to-b to-transparent",
                        isPast ? "from-teal-400" : "from-muted-foreground/40",
                      )} style={{ minHeight: 14 }} />
                    )}
                  </div>
                  <div className="flex-1 pb-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {i + 1}.
                      </span>
                      <p className={cn(
                        "text-[13px] font-medium leading-snug",
                        isPast && "line-through decoration-muted-foreground/40",
                      )}>
                        {s.instruction}
                      </p>
                    </div>
                    {s.distanceM > 0 && (
                      <p className="mt-0.5 pl-4 text-[10px] text-muted-foreground">
                        {formatDistance(s.distanceM)}
                        {s.cumulativeM > 0 && (
                          <span className="ml-1.5">· {formatDistance(s.cumulativeM)} so far</span>
                        )}
                        {s.direction && (
                          <span className="ml-1.5 rounded bg-muted px-1">{s.direction}</span>
                        )}
                      </p>
                    )}
                  </div>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
