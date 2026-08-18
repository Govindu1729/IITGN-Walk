"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, RotateCcw, Footprints, Gauge, Zap } from "lucide-react";
import {
  type Settings,
  type ThemePref,
  type Units,
  type Language,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "@/lib/settings";
import type { WalkingMode } from "@/lib/routing/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  /** Called whenever settings change so the parent can re-apply them live. */
  onSettingsChange?: (s: Settings) => void;
}

const WALKING_MODES: Array<{
  value: WalkingMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  speed: string;
  color: string;
}> = [
  {
    value: "RELAXED",
    label: "Relaxed",
    icon: Footprints,
    desc: "Stroll pace",
    speed: "~0.9 m/s",
    color: "text-emerald-600",
  },
  {
    value: "NORMAL",
    label: "Normal",
    icon: Gauge,
    desc: "Default pace",
    speed: "~1.2 m/s",
    color: "text-teal-600",
  },
  {
    value: "HURRY",
    label: "Hurry",
    icon: Zap,
    desc: "Brisk walk",
    speed: "~1.6 m/s",
    color: "text-orange-600",
  },
];

export function SettingsPanel({ onSettingsChange }: Props) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Load settings once on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  // Persist and notify parent whenever settings change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
    onSettingsChange?.(settings);
  }, [settings, hydrated, onSettingsChange]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setSettings({ ...DEFAULT_SETTINGS });
    toast.success("Settings reset to defaults");
  }

  // Helper: render a labelled row with a control on the right (defined at
  // module scope below to satisfy the react-hooks/static-components rule).

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Open settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-teal-600" />
            Settings &amp; Preferences
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Walking Mode */}
          <section>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Default Walking Mode
            </Label>
            <RadioGroup
              value={settings.defaultWalkingMode}
              onValueChange={(v) => update("defaultWalkingMode", v as WalkingMode)}
              className="grid grid-cols-3 gap-2"
            >
              {WALKING_MODES.map((m) => {
                const Icon = m.icon;
                const active = settings.defaultWalkingMode === m.value;
                return (
                  <Label
                    key={m.value}
                    htmlFor={`set-mode-${m.value}`}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all",
                      active
                        ? "border-teal-500 bg-teal-50/60 dark:bg-teal-950/40"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <RadioGroupItem
                      value={m.value}
                      id={`set-mode-${m.value}`}
                      className="sr-only"
                    />
                    <Icon className={cn("h-4 w-4", active ? m.color : "text-muted-foreground")} />
                    <span className="text-[11px] font-medium">{m.label}</span>
                    <span className="text-[9px] text-muted-foreground">{m.speed}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </section>

          <Separator />

          {/* Accessibility */}
          <section className="space-y-2">
            <Label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Accessibility
            </Label>
            <Row
              label="Accessible routes by default"
              description="Avoid stairs and unpaved paths on planner mount"
            >
              <Switch
                checked={settings.defaultAccessibleOnly}
                onCheckedChange={(b) => update("defaultAccessibleOnly", b)}
                aria-label="Default to accessible routes"
              />
            </Row>
          </section>

          <Separator />

          {/* Units */}
          <section>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Distance Units
            </Label>
            <RadioGroup
              value={settings.units}
              onValueChange={(v) => update("units", v as Units)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { value: "METRIC" as const, label: "Metric", sub: "km · m" },
                { value: "IMPERIAL" as const, label: "Imperial", sub: "mi · ft" },
              ].map((u) => {
                const active = settings.units === u.value;
                return (
                  <Label
                    key={u.value}
                    htmlFor={`set-units-${u.value}`}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border p-2.5 text-center transition-all",
                      active
                        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <RadioGroupItem
                      value={u.value}
                      id={`set-units-${u.value}`}
                      className="sr-only"
                    />
                    <span className="text-xs font-medium">{u.label}</span>
                    <span className="text-[9px] text-muted-foreground">{u.sub}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </section>

          <Separator />

          {/* Custom walking speed */}
          <section className="space-y-2">
            <Label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Custom Walking Speed
            </Label>
            <div className="rounded-lg border bg-card/50 px-3 py-3">
              <div className="flex items-baseline justify-between">
                <p className="text-xs">
                  Override learned speed
                </p>
                <span className="rounded-full bg-background/60 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {settings.customWalkingSpeedMps > 0
                    ? `${settings.customWalkingSpeedMps.toFixed(2)} m/s`
                    : "auto (learned)"}
                </span>
              </div>
              <Slider
                value={[settings.customWalkingSpeedMps]}
                min={0}
                max={2.5}
                step={0.05}
                onValueChange={([v]) => update("customWalkingSpeedMps", v)}
                className="mt-3"
              />
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/70">
                <span>0 (auto)</span>
                <span>0.9</span>
                <span>1.25</span>
                <span>1.6</span>
                <span>2.5 m/s</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Used for ETA calculations when &gt; 0; otherwise the system uses your
                learned campus speed.
              </p>
            </div>
          </section>

          <Separator />

          {/* Visibility toggles */}
          <section className="space-y-2">
            <Label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Visible Components
            </Label>
            <Row
              label="Weather widget"
              description="Show current campus weather in the header"
            >
              <Switch
                checked={settings.showWeatherWidget}
                onCheckedChange={(b) => update("showWeatherWidget", b)}
                aria-label="Show weather widget"
              />
            </Row>
            <Row
              label="Elevation profile"
              description="Show mini terrain chart under each route card"
            >
              <Switch
                checked={settings.showElevationProfile}
                onCheckedChange={(b) => update("showElevationProfile", b)}
                aria-label="Show elevation profile"
              />
            </Row>
          </section>

          <Separator />

          {/* Language */}
          <section>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Language
            </Label>
            <Select
              value={settings.language}
              onValueChange={(v) => update("language", v as Language)}
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EN">English</SelectItem>
                <SelectItem value="HI">हिन्दी (Hindi)</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Hindi is informational — full translation is on the roadmap.
            </p>
          </section>

          <Separator />

          {/* Theme */}
          <section>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Theme
            </Label>
            <Select
              value={settings.theme}
              onValueChange={(v) => update("theme", v as ThemePref)}
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SYSTEM">System</SelectItem>
                <SelectItem value="LIGHT">Light</SelectItem>
                <SelectItem value="DARK">Dark</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <Separator />

          {/* Reset */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Helper row component — declared at module scope to satisfy the
   react-hooks/static-components rule (components must not be created during
   another component's render).
   ──────────────────────────────────────────────────────────────────────── */
function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card/50 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        {description && (
          <p className="text-[10px] text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
