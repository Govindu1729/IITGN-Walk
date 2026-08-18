"use client";

// Indoor Floor Plan viewer — opens a Dialog showing an SVG-rendered floor plan
// for a major IITGN building (Library, AB1, LHC).
//
// Coordinates are 0–100 × 0–100 percentage units (SVG viewBox="0 0 100 100").
// Features are colour-coded by `IndoorFeatureType`. Hovering a feature shows a
// tooltip with notes / capacity; clicking selects it and shows a detail panel
// below the SVG.
//
// Dark-mode aware (uses `dark:` variants in legend + detail panel).
// Mobile-responsive: SVG fills container width; dialog max-w-3xl on desktop.

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DoorOpen,
  Users,
  BookOpen,
  MoveUp,
  ArrowUpDown,
  Coffee,
  Info,
  X,
} from "lucide-react";
import {
  getIndoorPlan,
  FEATURE_COLORS,
  DEFAULT_LEGEND,
  type IndoorFeature,
  type IndoorPlan,
} from "@/lib/campus/indoor-plans";

interface Props {
  /** Slug of the building whose indoor plan should be shown. */
  buildingSlug: string;
  /** Called when the user dismisses the dialog (close button, overlay click, ESC). */
  onClose: () => void;
}

/** Friendly label + Lucide icon for a feature type (used in detail panel header). */
function featureTypeMeta(type: IndoorFeature["type"]): { label: string; icon: React.ReactNode } {
  switch (type) {
    case "room":
      return { label: "Room", icon: <Info className="h-3 w-3" /> };
    case "restroom-m":
      return { label: "Men's Restroom", icon: <DoorOpen className="h-3 w-3" /> };
    case "restroom-f":
      return { label: "Women's Restroom", icon: <DoorOpen className="h-3 w-3" /> };
    case "exit":
      return { label: "Exit", icon: <DoorOpen className="h-3 w-3" /> };
    case "stairs":
      return { label: "Stairs", icon: <MoveUp className="h-3 w-3" /> };
    case "elevator":
      return { label: "Elevator", icon: <ArrowUpDown className="h-3 w-3" /> };
    case "corridor":
      return { label: "Corridor / Lobby", icon: <Info className="h-3 w-3" /> };
    case "classroom":
      return { label: "Classroom", icon: <BookOpen className="h-3 w-3" /> };
    case "lab":
      return { label: "Computer Lab", icon: <BookOpen className="h-3 w-3" /> };
    case "office":
      return { label: "Office", icon: <Info className="h-3 w-3" /> };
    case "cafe":
      return { label: "Café", icon: <Coffee className="h-3 w-3" /> };
    case "study-area":
      return { label: "Study Area", icon: <BookOpen className="h-3 w-3" /> };
    default:
      return { label: type, icon: <Info className="h-3 w-3" /> };
  }
}

/** Pick a font size based on the rect's smaller dimension so labels stay legible. */
function fontSizeFor(w: number, h: number): number {
  const min = Math.min(w, h);
  if (min < 6) return 1.6;
  if (min < 10) return 2;
  if (min < 16) return 2.4;
  return 2.8;
}

/** Lightness adjustment so text is readable on both light + dark fills. */
function textColorFor(type: IndoorFeature["type"]): string {
  // Dark fills → white text. Light fills → near-black text.
  switch (type) {
    case "restroom-m": // teal-600
    case "restroom-f": // rose-600
    case "exit": // emerald-500 (medium)
    case "stairs": // amber-500 (medium)
    case "elevator": // violet-600
      return "#ffffff";
    default:
      return "#0f172a"; // slate-900
  }
}

export function IndoorPlanView({ buildingSlug, onClose }: Props) {
  // open state mirrors the controlled Dialog (radix requires it for ESC + overlay click)
  const [open, setOpen] = React.useState(true);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const plan: IndoorPlan | null = getIndoorPlan(buildingSlug);

  // Reset selection when the building changes
  React.useEffect(() => {
    setSelectedId(null);
    setHoveredId(null);
  }, [buildingSlug]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
    // Defer the parent state update so the close animation can play.
    setTimeout(() => onClose(), 50);
  }, [onClose]);

  if (!plan) {
    // Defensive: parent should only render this when hasIndoorPlan(slug) is true.
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No indoor plan</DialogTitle>
            <DialogDescription>
              This building does not have an indoor floor plan available.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const legend = plan.legend ?? DEFAULT_LEGEND;
  const selectedFeature = plan.features.find((f) => f.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="gap-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <DoorOpen className="h-4 w-4 text-teal-600" />
            {plan.buildingName}
            <Badge variant="outline" className="text-[10px] font-normal">
              {plan.floorName}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Interactive floor plan · hover or tap a room to see details
          </DialogDescription>
        </DialogHeader>

        {/* SVG floor plan — responsive, fills container width */}
        <div className="rounded-lg border bg-muted/30 p-2 dark:bg-muted/20">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            className="h-auto w-full"
            style={{ aspectRatio: "1 / 1" }}
            role="img"
            aria-label={`Floor plan of ${plan.buildingName}, ${plan.floorName}`}
          >
            <defs>
              {/* Outer-building emerald gradient fill */}
              <linearGradient id="indoor-shell-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ccfbf1" />
                <stop offset="100%" stopColor="#a7f3d0" />
              </linearGradient>
            </defs>

            {/* Outer building rectangle */}
            <rect
              x={0}
              y={0}
              width={100}
              height={100}
              rx={1.5}
              fill="url(#indoor-shell-grad)"
              stroke="#0d9488"
              strokeWidth={0.6}
              className="dark:opacity-90"
            />

            {/* Features */}
            {plan.features.map((f) => {
              const isHovered = hoveredId === f.id;
              const isSelected = selectedId === f.id;
              const fill = FEATURE_COLORS[f.type] ?? "#e2e8f0";
              const fontSize = fontSizeFor(f.w, f.h);
              const text = textColorFor(f.type);
              const showLabel = f.w >= 8 && f.h >= 4;
              // Render stroke brighter when hovered/selected
              const stroke = isSelected
                ? "#0d9488"
                : isHovered
                  ? "#14b8a6"
                  : "#94a3b8";
              const strokeWidth = isSelected ? 0.7 : isHovered ? 0.5 : 0.3;
              return (
                <g
                  key={f.id}
                  onMouseEnter={() => setHoveredId(f.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedId(f.id)}
                  style={{ cursor: "pointer" }}
                  role="button"
                  aria-label={`${f.label}${f.capacity ? ` (capacity ${f.capacity})` : ""}`}
                >
                  <rect
                    x={f.x}
                    y={f.y}
                    width={f.w}
                    height={f.h}
                    rx={0.6}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    opacity={isHovered || isSelected ? 1 : 0.92}
                  />
                  {showLabel && (
                    <text
                      x={f.x + f.w / 2}
                      y={f.y + f.h / 2}
                      fontSize={fontSize}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={text}
                      style={{
                        pointerEvents: "none",
                        fontFamily: "ui-sans-serif, system-ui, sans-serif",
                        fontWeight: 500,
                      }}
                    >
                      {f.label.length > 18 ? f.label.slice(0, 17) + "…" : f.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Compass rose (top-right corner) */}
            <g transform="translate(93, 4)" style={{ pointerEvents: "none" }}>
              <circle cx={0} cy={3} r={2.4} fill="#ffffff" stroke="#475569" strokeWidth={0.25} opacity={0.9} />
              <polygon points="0,1 0.7,4.6 0,3.8 -0.7,4.6" fill="#dc2626" />
              <text x={0} y={0.4} fontSize={1.4} textAnchor="middle" fill="#475569" fontWeight={700}>N</text>
            </g>
          </svg>
        </div>

        {/* Selected feature detail */}
        {selectedFeature && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-900 dark:bg-teal-950/40">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-teal-600 text-white">
                  {featureTypeMeta(selectedFeature.type).icon}
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    {selectedFeature.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {featureTypeMeta(selectedFeature.type).label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {selectedFeature.notes && (
              <p className="mt-1.5 text-[11px] leading-snug text-foreground/80">
                {selectedFeature.notes}
              </p>
            )}
            {selectedFeature.capacity !== undefined && selectedFeature.capacity > 0 && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                Capacity: <span className="font-medium text-foreground">{selectedFeature.capacity}</span>
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="rounded-lg border bg-card/60 p-3 dark:bg-card/40">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Legend
          </p>
          <ScrollArea className="max-h-24">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
              {legend.map((entry) => (
                <div
                  key={entry.type}
                  className="flex items-center gap-1.5 text-[10px] text-foreground/80"
                >
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-sm border border-border/60"
                    style={{ backgroundColor: entry.color }}
                    aria-hidden
                  />
                  <span className="truncate">{entry.label}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Close button */}
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
