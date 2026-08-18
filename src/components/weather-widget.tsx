"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  ThermometerSun,
  CloudSun,
  Droplets,
  Wind,
  CloudDrizzle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface WeatherData {
  temperature: number;
  condition: "Sunny" | "Cloudy" | "Rainy" | "Hot";
  humidity: number;
  windSpeed: number;
  impactFactor: number;
  description: string;
  icon: string;
}

const CONDITION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "sun": Sun,
  "cloud": Cloud,
  "cloud-rain": CloudRain,
  "cloud-sun": CloudSun,
  "thermometer-sun": ThermometerSun,
  "cloud-drizzle": CloudDrizzle,
};

const CONDITION_COLOR: Record<string, string> = {
  Sunny: "text-amber-500 dark:text-amber-400",
  Cloudy: "text-slate-400 dark:text-slate-300",
  Rainy: "text-sky-500 dark:text-sky-400",
  Hot: "text-rose-500 dark:text-rose-400",
};

/** Subtle gradient background per condition — provides ambient context */
const CONDITION_GRADIENT: Record<string, string> = {
  Sunny:
    "from-amber-50 via-orange-50/40 to-amber-100/30 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-900/10",
  Cloudy:
    "from-slate-50 via-slate-100/40 to-slate-200/30 dark:from-slate-900/40 dark:via-slate-800/20 dark:to-slate-700/10",
  Rainy:
    "from-sky-50 via-sky-100/40 to-slate-200/30 dark:from-sky-950/40 dark:via-sky-900/20 dark:to-slate-800/10",
  Hot: "from-rose-50 via-orange-50/40 to-rose-100/30 dark:from-rose-950/40 dark:via-orange-950/20 dark:to-rose-900/10",
};

interface Props {
  compact?: boolean;
  onWeatherLoaded?: (data: WeatherData) => void;
}

export function WeatherWidget({ compact = false, onWeatherLoaded }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then((d: WeatherData) => {
        setWeather(d);
        onWeatherLoaded?.(d);
      })
      .catch(() => {});
  }, [onWeatherLoaded]);

  if (!weather) return null;

  const IconComp = CONDITION_ICON[weather.icon] ?? Cloud;
  const colorClass = CONDITION_COLOR[weather.condition] ?? "text-muted-foreground";
  const gradientClass = CONDITION_GRADIENT[weather.condition] ?? "";

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md bg-gradient-to-r px-2 py-1 text-xs ring-1 ring-border/40",
          gradientClass,
        )}
        title={weather.description}
      >
        <IconComp className={cn("h-3.5 w-3.5", colorClass)} />
        <span className="tabular-nums font-semibold">
          {Math.round(weather.temperature)}°C
        </span>
        {weather.impactFactor < 1.0 && (
          <Badge
            variant="secondary"
            className="h-4 gap-0.5 px-1 text-[8px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
          >
            ×{weather.impactFactor}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-3 shadow-sm ring-1 ring-border/30 transition-all hover:shadow-md",
        gradientClass,
      )}
    >
      {/* Decorative ambient circle for depth */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/20 blur-2xl dark:bg-white/5"
        aria-hidden
      />
      <div className="relative flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg bg-white/60 shadow-sm ring-1 ring-border/40 dark:bg-black/30",
          )}
        >
          <IconComp className={cn("h-5 w-5", colorClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tabular-nums">
              {Math.round(weather.temperature)}°C
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {weather.condition}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Droplets className="h-2.5 w-2.5" />
              <span className="tabular-nums">{weather.humidity}%</span>
            </span>
            <span className="flex items-center gap-0.5">
              <Wind className="h-2.5 w-2.5" />
              <span className="tabular-nums">{weather.windSpeed} km/h</span>
            </span>
          </div>
        </div>
        {weather.impactFactor < 1.0 && (
          <Badge
            variant="secondary"
            className="ml-1 gap-0.5 bg-amber-100/80 text-[9px] text-amber-800 ring-1 ring-amber-300/40 dark:bg-amber-950/80 dark:text-amber-300 dark:ring-amber-700/40"
          >
            ×{weather.impactFactor}
          </Badge>
        )}
      </div>
      {weather.impactFactor < 1.0 && (
        <p className="relative mt-2 border-t border-border/30 pt-1.5 text-[10px] leading-snug text-amber-700 dark:text-amber-300">
          {weather.description}
        </p>
      )}
    </div>
  );
}
