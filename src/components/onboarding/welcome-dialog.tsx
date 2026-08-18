"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Footprints,
  Route as RouteIcon,
  Gauge,
  Brain,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "iitgn-onboarded";

interface Step {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Welcome to IITGN Walk",
    subtitle: "Campus navigation, made personal",
    icon: Footprints,
    iconBg: "from-teal-500 to-emerald-600",
    body: (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          IITGN Walk is a campus-specific navigation platform built for{" "}
          <strong className="text-foreground">IIT Gandhinagar</strong>. Unlike
          generic map apps, every path, building, and decision node in our routing
          graph is part of the campus itself — not third-party street tiles.
        </p>
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="flex items-center gap-2 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Smartest walking routes on campus
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Multi-Route Routing",
    subtitle: "Fastest, shortest, easiest — all at once",
    icon: RouteIcon,
    iconBg: "from-violet-500 to-purple-600",
    body: (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Every plan computes <strong className="text-foreground">four</strong>{" "}
          alternative routes simultaneously — the shortest route isn&apos;t
          always the fastest.
        </p>
        <div className="grid grid-cols-1 gap-2">
          <MiniRow
            color="bg-teal-500"
            label="Fastest"
            desc="Least total walking time"
            icon={Zap}
          />
          <MiniRow
            color="bg-amber-500"
            label="Shortest"
            desc="Minimum physical distance"
            icon={RouteIcon}
          />
          <MiniRow
            color="bg-violet-500"
            label="Easiest"
            desc="Lowest difficulty (avoid stairs/slopes)"
            icon={Sparkles}
          />
          <MiniRow
            color="bg-sky-500"
            label="Alternative"
            desc="A meaningfully different path"
            icon={Footprints}
          />
        </div>
      </div>
    ),
  },
  {
    title: "Walking Modes",
    subtitle: "Pick the pace that fits your day",
    icon: Gauge,
    iconBg: "from-sky-500 to-cyan-600",
    body: (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Each route is recalculated for your walking mode — adjust on the planner
          and ETAs update immediately.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <ModeCard
            icon={Footprints}
            label="Relaxed"
            speed="~0.9 m/s"
            color="text-emerald-600"
            bg="from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-950/20"
          />
          <ModeCard
            icon={Gauge}
            label="Normal"
            speed="~1.2 m/s"
            color="text-teal-600"
            bg="from-teal-50 to-teal-100/50 dark:from-teal-950/40 dark:to-teal-950/20"
          />
          <ModeCard
            icon={Zap}
            label="Hurry"
            speed="~1.6 m/s"
            color="text-orange-600"
            bg="from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-950/20"
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Tip: open the Settings gear to set a default mode and override your
          walking speed for ETAs.
        </p>
      </div>
    ),
  },
  {
    title: "Continuous Learning",
    subtitle: "Every walk improves future predictions",
    icon: Brain,
    iconBg: "from-amber-500 to-orange-600",
    body: (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          When you tap <strong className="text-foreground">&quot;I&apos;ve Arrived&quot;</strong>,
          your actual walking time is recorded. The system recomputes your campus
          walking speed as <em>Σdistance ÷ Σtime</em> and blends it with defaults
          until enough samples exist.
        </p>
        <div className="rounded-lg border bg-gradient-to-br from-amber-50/40 to-orange-50/40 p-3 dark:from-amber-950/20 dark:to-orange-950/20">
          <p className="flex items-center gap-2 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Earn achievements &amp; build streaks as you walk
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Badges unlock automatically — first walk, distance milestones,
            multi-day streaks, accessibility champion, and more.
          </p>
        </div>
        <p className="text-center text-xs font-medium text-teal-600 dark:text-teal-400">
          Ready? Let&apos;s get walking. 🚶
        </p>
      </div>
    ),
  },
];

function MiniRow({
  color,
  label,
  desc,
  icon: Icon,
}: {
  color: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card/50 px-2.5 py-2">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-md text-white", color)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  label,
  speed,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  speed: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-gradient-to-br p-2.5 text-center", bg)}>
      <Icon className={cn("mx-auto h-4 w-4", color)} />
      <p className="mt-1 text-xs font-semibold">{label}</p>
      <p className="font-mono text-[9px] tabular-nums text-muted-foreground">
        {speed}
      </p>
    </div>
  );
}

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Show only on first visit (no `iitgn-onboarded` in localStorage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Defer to next tick so the dialog animation doesn't clash with
        // initial page hydration.
        const t = setTimeout(() => setOpen(true), 400);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function skip() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const Step = STEPS[step];
  const StepIcon = Step.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden p-0 sm:max-w-md"
        showCloseButton={false}
      >
        {/* Hero header with gradient + icon */}
        <div
          className={cn(
            "relative bg-gradient-to-br p-6 text-white",
            Step.iconBg,
          )}
        >
          {/* Decorative blurred circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-black/10 blur-2xl" />

          <button
            onClick={skip}
            className="absolute right-3 top-3 rounded-full bg-white/15 p-1 text-white/80 transition-colors hover:bg-white/25 hover:text-white"
            aria-label="Skip onboarding"
          >
            <X className="h-4 w-4" />
          </button>

          <DialogHeader className="relative z-10 space-y-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <StepIcon className="h-7 w-7" />
            </div>
            <DialogTitle className="text-xl font-bold leading-tight">
              {Step.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/80">
              {Step.subtitle}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="relative z-10 mt-4 flex gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all",
                  i === step
                    ? "bg-white"
                    : i < step
                      ? "bg-white/70"
                      : "bg-white/25",
                )}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {Step.body}

          {/* Footer nav */}
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={skip}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Skip onboarding
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="gap-1.5 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              )}
              {isLast ? (
                <Button
                  size="sm"
                  onClick={finish}
                  className="gap-1.5 bg-gradient-to-r from-teal-700 to-emerald-700 text-xs hover:from-teal-800 hover:to-emerald-800"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Get Started
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  className="gap-1.5 bg-gradient-to-r from-teal-700 to-emerald-700 text-xs hover:from-teal-800 hover:to-emerald-800"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Small step text */}
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Step {step + 1} of {STEPS.length}
            {!isLast && (
              <span className="ml-1 inline-flex items-center">
                · next: <ChevronRight className="h-2.5 w-2.5" />
                {STEPS[step + 1].title}
              </span>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
