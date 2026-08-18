"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VoiceToggleProps {
  /** Whether voice announcements are currently enabled. */
  enabled: boolean;
  /** Whether the browser supports the Web Speech API. */
  supported?: boolean;
  /** Toggle handler (toggles enabled state + persists). */
  onToggle: () => void;
}

/**
 * A small, premium-styled toggle button for the NavigationPanel header.
 *
 * Visual states:
 *  - disabled (unsupported browser): muted gray, greyed out, non-interactive
 *  - OFF: muted gray ghost icon button
 *  - ON: teal-tinted background + teal icon + subtle voice-pulse animation
 *
 * Uses a cross-fade icon swap (VolumeX ⇄ Volume2) animated via
 * `transition-transform duration-200` so the toggle feels responsive without
 * being distracting. Touch-friendly h-8 w-8 on all viewports.
 */
export function VoiceToggle({
  enabled,
  supported = true,
  onToggle,
}: VoiceToggleProps) {
  const tooltipText = !supported
    ? "Voice navigation not supported in this browser"
    : enabled
      ? "Voice navigation: ON"
      : "Voice navigation: OFF";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={tooltipText}
          aria-pressed={enabled}
          disabled={!supported}
          onClick={onToggle}
          className={cn(
            "h-8 w-8 rounded-lg shadow-premium-1 transition-all duration-200 hover:shadow-premium-2",
            enabled
              ? "voice-pulse bg-teal-100/60 text-teal-700 hover:bg-teal-200/70 hover:text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/50"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span className="relative inline-flex h-4 w-4 items-center justify-center">
            <VolumeX
              className={cn(
                "absolute h-4 w-4 transition-transform duration-200",
                enabled
                  ? "scale-50 rotate-45 opacity-0"
                  : "scale-100 rotate-0 opacity-100",
              )}
            />
            <Volume2
              className={cn(
                "absolute h-4 w-4 transition-transform duration-200",
                enabled
                  ? "scale-100 rotate-0 opacity-100"
                  : "scale-50 -rotate-45 opacity-0",
              )}
            />
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
