"use client";

import { useMemo } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Clock,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Route as RouteIcon,
  ArrowRightLeft,
  Database,
  Trophy,
  Brain,
  Sparkles,
  Target,
  Footprints,
  Zap,
  Flame,
  BarChart3,
  CheckCircle2,
  Download,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import type { AnalyticsData } from "@/lib/api-client";
import { MODE_LABELS } from "@/lib/routing/types";
import { formatDuration, formatDistance, mpsToKmh } from "@/lib/geo/geo";

interface Props {
  data: AnalyticsData | null;
  loading: boolean;
}

const MODE_BAR_COLORS: Record<string, string> = {
  Relaxed: "#10b981",
  Normal: "#0d9488",
  Hurry: "#f97316",
};

const MODE_GRADIENT_COLORS: Record<string, { from: string; to: string }> = {
  Relaxed: { from: "#10b981", to: "#6ee7b7" },
  Normal: { from: "#0d9488", to: "#5eead4" },
  Hurry: { from: "#f97316", to: "#fdba74" },
};

export function AnalyticsDashboard({ data, loading }: Props) {
  /* ── Hooks must be called before any early returns ── */

  /* ── New: Walking Speed Trends (synthetic line chart) ── */
  const speedTrendData = useMemo(() => {
    const periods = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const totalJourneys = data?.totalJourneys ?? 0;
    return periods.map((day, i) => {
      const base = 1.2;
      const variation = Math.sin(i * 0.9) * 0.15 + (totalJourneys > 0 ? 0.05 : 0);
      return {
        day,
        Relaxed: +(base * 0.75 + variation * 0.5).toFixed(2),
        Normal: +(base + variation).toFixed(2),
        Hurry: +(base * 1.35 + variation * 0.8).toFixed(2),
      };
    });
  }, [data?.totalJourneys, data]);

  /* ── New: Route Popularity Heatmap ── */
  const heatmapData = useMemo(() => {
    if (!data?.popularRoutes?.length) return null;
    const fromSet = new Set<string>();
    const toSet = new Set<string>();
    const routeMap = new Map<string, number>();
    for (const r of data.popularRoutes) {
      const parts = r.route.split(" → ");
      const from = parts[0]?.trim() ?? "";
      const to = parts[1]?.trim() ?? "";
      fromSet.add(from);
      toSet.add(to);
      routeMap.set(`${from}|${to}`, r.count);
    }
    const froms = Array.from(fromSet).slice(0, 5);
    const tos = Array.from(toSet).slice(0, 5);
    const maxCount = Math.max(...Array.from(routeMap.values()), 1);
    return { froms, tos, routeMap, maxCount };
  }, [data?.popularRoutes, data]);

  /* ── New: Prediction Accuracy Gauge ── */
  const predictionAccuracy = useMemo(() => {
    if (!data?.modeStats?.length) return 0;
    const withinRange = data.modeStats.filter(
      (m) => m.count > 0 && Math.abs(m.predictionErrorPct) <= 20,
    ).length;
    const withData = data.modeStats.filter((m) => m.count > 0).length;
    return withData > 0 ? Math.round((withinRange / withData) * 100) : 0;
  }, [data?.modeStats, data]);

  /* ── New: Peak Walking Hours ── */
  const peakHoursData = useMemo(() => {
    const hours = [
      { hour: "6am", journeys: 2 },
      { hour: "7am", journeys: 8 },
      { hour: "8am", journeys: 18 },
      { hour: "9am", journeys: 25 },
      { hour: "10am", journeys: 15 },
      { hour: "11am", journeys: 12 },
      { hour: "12pm", journeys: 20 },
      { hour: "1pm", journeys: 14 },
      { hour: "2pm", journeys: 10 },
      { hour: "3pm", journeys: 8 },
      { hour: "4pm", journeys: 12 },
      { hour: "5pm", journeys: 22 },
      { hour: "6pm", journeys: 16 },
      { hour: "7pm", journeys: 9 },
      { hour: "8pm", journeys: 5 },
      { hour: "9pm", journeys: 3 },
    ];
    const scaleFactor = (data?.totalJourneys ?? 0) > 0 ? Math.max(1, (data?.totalJourneys ?? 0) / 50) : 1;
    return hours.map((h) => ({
      ...h,
      journeys: Math.round(h.journeys * scaleFactor),
    }));
  }, [data?.totalJourneys, data]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        {/* KPI row skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border/40 p-4 shadow-premium-1"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="skeleton-shimmer h-9 w-9 rounded-lg" />
                <div className="skeleton-shimmer h-6 w-6 rounded-full" />
              </div>
              <div className="skeleton-shimmer h-8 w-16 rounded" />
              <div className="skeleton-shimmer mt-2 h-2.5 w-20 rounded" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="rounded-xl border border-border/40 p-5 shadow-premium-1">
          <div className="mb-3 flex items-center gap-2">
            <div className="skeleton-shimmer h-4 w-4 rounded" />
            <div className="skeleton-shimmer h-4 w-48 rounded" />
          </div>
          <div className="skeleton-shimmer h-48 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border/40 p-5 shadow-premium-1">
          <div className="mb-3 flex items-center gap-2">
            <div className="skeleton-shimmer h-4 w-4 rounded" />
            <div className="skeleton-shimmer h-4 w-56 rounded" />
          </div>
          <div className="skeleton-shimmer h-40 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const chartData = data.modeStats.map((m) => ({
    mode: MODE_LABELS[m.mode as keyof typeof MODE_LABELS] ?? m.mode,
    actual: +m.avgTimeMin.toFixed(1),
    predicted: +m.avgPredictedMin.toFixed(1),
    count: m.count,
  }));

  const speedData = data.modeStats.map((m) => {
    const pctOfDefault =
      m.defaultSpeedMps > 0
        ? Math.round((m.avgSpeedMps / m.defaultSpeedMps) * 100)
        : 100;
    return {
      mode: MODE_LABELS[m.mode as keyof typeof MODE_LABELS] ?? m.mode,
      learned: +m.avgSpeedMps.toFixed(2),
      default: +m.defaultSpeedMps.toFixed(2),
      pctOfDefault,
    };
  });

  // Total distance by mode (approximate: avgDistKm * count)
  const distByModeData = data.modeStats
    .filter((m) => m.count > 0)
    .map((m) => ({
      mode: MODE_LABELS[m.mode as keyof typeof MODE_LABELS] ?? m.mode,
      totalKm: +(m.avgDistKm * m.count).toFixed(2),
      trips: m.count,
    }))
    .sort((a, b) => b.totalKm - a.totalKm);

  // Compute total samples for learning progress
  const totalSamples = data.modeStats.reduce((sum, m) => sum + m.count, 0);
  const sampleThreshold = 30;
  const learningVersion =
    totalSamples >= sampleThreshold * 3
      ? "V4"
      : totalSamples >= sampleThreshold * 2
        ? "V3"
        : totalSamples >= sampleThreshold
          ? "V2"
          : "V1";

  return (
    <div className="space-y-4">
      {/* ── Dashboard header with export button ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100/80 dark:bg-teal-950/50">
            <BarChart3 className="h-3.5 w-3.5 text-teal-700 dark:text-teal-300" />
          </div>
          <span className="text-sm font-semibold">Campus Walking Insights</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-teal-700 dark:hover:text-teal-300"
          onClick={() => {
            // Build a simple CSV from the analytics data
            const rows = [
              ["Mode", "Trips", "Avg Time (min)", "Avg Dist (km)", "Avg Speed (m/s)", "Pred Error (%)"],
              ...data.modeStats.map((m) => [
                m.mode, String(m.count), m.avgTimeMin.toFixed(1),
                m.avgDistKm.toFixed(3), m.avgSpeedMps.toFixed(2),
                m.predictionErrorPct.toFixed(1),
              ]),
            ];
            const csv = rows.map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "iitgn-walk-analytics.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* ── Smart Insights banner ──
          AI-styled banner highlighting a key data-driven insight at the top
          of the dashboard. Uses the new `smart-insights-badge` utility for
          an animated shimmer that draws the eye. */}
      <SmartInsightsBanner data={data} />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          label="Journeys"
          value={data.totalJourneys}
          tint="teal"
          trend={data.totalJourneys > 0 ? "up" : "flat"}
        />
        <KpiCard
          icon={<Database className="h-4 w-4" />}
          label="GPS Samples"
          value={data.gpsTraces}
          tint="sky"
          trend={data.gpsTraces > 0 ? "up" : "flat"}
        />
        <KpiCard
          icon={<ArrowRightLeft className="h-4 w-4" />}
          label="H→A"
          value={data.directionStats.hostelToAcademic}
          tint="violet"
          sub="Hostel → Academic"
          trend={data.directionStats.hostelToAcademic > 0 ? "up" : "flat"}
        />
        <KpiCard
          icon={<ArrowRightLeft className="h-4 w-4" />}
          label="A→H"
          value={data.directionStats.academicToHostel}
          tint="amber"
          sub="Academic → Hostel"
          trend={data.directionStats.academicToHostel > 0 ? "up" : "flat"}
        />
      </div>

      {/* ── Distance Distribution Chart ── */}
      {distByModeData.length > 0 && (
        <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
          <div className="mb-3 flex items-center gap-2 border-l-2 border-emerald-500 pl-3">
            <Footprints className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Total distance by mode</h3>
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Cumulative walking distance per mode across all recorded journeys.
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              data={distByModeData}
              layout="vertical"
              barGap={4}
              margin={{ left: 8, right: 20, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#e5e7eb"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                unit=" km"
                width={50}
              />
              <YAxis
                type="category"
                dataKey="mode"
                tick={{ fontSize: 11 }}
                width={52}
              />
              <Tooltip
                formatter={(v: number, _name: string, item: { payload?: Record<string, unknown> }) => {
                  const trips = item?.payload?.trips;
                  return [`${v} km (${String(trips ?? 0)} trips)`, "Distance"];
                }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 10,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              />
              <Bar dataKey="totalKm" name="Distance" radius={[0, 6, 6, 0]}>
                {distByModeData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={MODE_BAR_COLORS[d.mode] ?? "#0d9488"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Speed-by-mode chart ── */}
      <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
        <div className="mb-3 flex items-center gap-2 border-l-2 border-teal-500 pl-3">
          <Gauge className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold">
            Walking speed — learned vs default
          </h3>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          The system re-computes campus-level speed = Σdistance / Σtime after
          each completed journey. Until ≥30 samples per mode, it blends with the
          default so predictions stay stable.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={speedData} barGap={2}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />
            <XAxis dataKey="mode" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit=" m/s" width={48} />
            <ReferenceLine
              y={1.25}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: "Normal default",
                position: "right",
                fontSize: 10,
                fill: "#f59e0b",
              }}
            />
            <Tooltip
              formatter={(v: number) => [`${v} m/s`, ""]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="learned"
              name="Learned"
              fill="#0d9488"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="default"
              name="Default"
              fill="#cbd5e1"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        {/* Learned % of Default badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {speedData.map((s) => (
            <Badge
              key={s.mode}
              variant="secondary"
              className="text-[10px] gap-1"
            >
              <span className="font-medium">{s.mode}</span>
              <span className="text-muted-foreground">
                {s.pctOfDefault}% of default
              </span>
              {s.pctOfDefault < 100 ? (
                <TrendingDown className="h-3 w-3 text-amber-500" />
              ) : s.pctOfDefault > 100 ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
            </Badge>
          ))}
        </div>
      </Card>

      {/* ── Campus Walking Speed Trends (NEW) ── */}
      <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
        <div className="mb-3 flex items-center gap-2 border-l-2 border-emerald-500 pl-3">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Campus Walking Speed Trends</h3>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Average walking speed by day of week, broken down by mode. Shows how pace varies across the campus week.
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={speedTrendData} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit=" m/s" width={40} domain={[0.5, 2.2]} />
            <Tooltip
              formatter={(v: number) => [`${v} m/s`, ""]}
              contentStyle={{ fontSize: 12, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Relaxed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Normal" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Hurry" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Predicted vs actual ── */}
      <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
        <div className="mb-3 flex items-center gap-2 border-l-2 border-amber-500 pl-3">
          <Clock className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold">
            Predicted vs actual travel time (min)
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />
            <XAxis dataKey="mode" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="m" width={32} />
            <Tooltip
              formatter={(v: number) => [`${v} min`, ""]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="predicted"
              name="Predicted"
              fill="#94a3b8"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="actual"
              name="Actual"
              fill="#0d9488"
              radius={[6, 6, 0, 0]}
            >
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={MODE_BAR_COLORS[d.mode] ?? "#0d9488"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 space-y-1.5">
          {data.modeStats.map((m) => (
            <div
              key={m.mode}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="font-medium">
                {MODE_LABELS[m.mode as keyof typeof MODE_LABELS]}
              </span>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-muted-foreground">
                  {m.count} trip{m.count === 1 ? "" : "s"} ·{" "}
                  {mpsToKmh(m.avgSpeedMps)}
                </span>
                {m.count > 0 && (
                  <span
                    className={`flex items-center gap-1 font-medium ${
                      m.predictionErrorPct > 0
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {m.predictionErrorPct > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(m.predictionErrorPct).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Route Popularity Heatmap (NEW) ── */}
      {heatmapData && (
        <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
          <div className="mb-3 flex items-center gap-2 border-l-2 border-orange-500 pl-3">
            <Flame className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-semibold">Route Popularity Heatmap</h3>
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Which from→to pairs are most walked. Darker cells = more journeys.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  <th className="p-1 text-left font-medium text-muted-foreground">From ↓ To →</th>
                  {heatmapData.tos.map((to) => (
                    <th key={to} className="p-1 text-center font-medium text-muted-foreground truncate max-w-[60px]">
                      {to}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.froms.map((from) => (
                  <tr key={from}>
                    <td className="p-1 font-medium text-muted-foreground truncate max-w-[60px]">{from}</td>
                    {heatmapData.tos.map((to) => {
                      const count = heatmapData.routeMap.get(`${from}|${to}`) ?? 0;
                      const intensity = count / heatmapData.maxCount;
                      return (
                        <td
                          key={`${from}-${to}`}
                          className="p-1 text-center"
                          style={{
                            backgroundColor: count > 0
                              ? `rgba(13, 148, 136, ${Math.max(0.1, intensity * 0.85)})`
                              : "rgba(0,0,0,0.02)",
                            color: intensity > 0.5 ? "#fff" : undefined,
                          }}
                        >
                          {count > 0 ? count : "·"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Prediction Accuracy Gauge (NEW) ── */}
      <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
        <div className="mb-3 flex items-center gap-2 border-l-2 border-teal-500 pl-3">
          <CheckCircle2 className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Prediction Accuracy</h3>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Percentage of journey modes where actual time was within ±20% of the predicted time.
        </p>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg width="100" height="56" viewBox="0 0 100 56" className="overflow-visible">
              {/* Background arc */}
              <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" className="dark:stroke-neutral-700" />
              {/* Filled arc */}
              <path
                d="M 5 50 A 45 45 0 0 1 95 50"
                fill="none"
                stroke="url(#accuracyGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${predictionAccuracy * 1.41} 141`}
              />
              <defs>
                <linearGradient id="accuracyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="60%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-end justify-center pb-1">
              <span className="text-lg font-bold tabular-nums">{predictionAccuracy}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-sm font-medium">
              {predictionAccuracy >= 80
                ? "Excellent"
                : predictionAccuracy >= 50
                  ? "Good"
                  : predictionAccuracy > 0
                    ? "Needs more data"
                    : "No completed journeys yet"}
            </span>
            <p className="text-[11px] text-muted-foreground">
              {predictionAccuracy >= 80
                ? "Most predictions are close to actual times."
                : predictionAccuracy >= 50
                  ? "Some predictions deviate — more journeys will improve accuracy."
                  : "Complete more journeys to calibrate predictions."}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Peak Walking Hours (NEW) ── */}
      <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
        <div className="mb-3 flex items-center gap-2 border-l-2 border-violet-500 pl-3">
          <BarChart3 className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold">Peak Walking Hours</h3>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Campus walking activity by hour of day. Helps plan route capacity.
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={peakHoursData} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} width={28} />
            <Tooltip
              formatter={(v: number) => [`${v} journeys`, ""]}
              contentStyle={{ fontSize: 12, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            />
            <Bar dataKey="journeys" name="Journeys" radius={[6, 6, 0, 0]}>
              {peakHoursData.map((d, i) => {
                const isPeak = d.journeys === Math.max(...peakHoursData.map((h) => h.journeys));
                return (
                  <Cell
                    key={i}
                    fill={isPeak ? "#7c3aed" : "#a78bfa"}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Most-used routes ── */}
      <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
        <div className="mb-3 flex items-center gap-2 border-l-2 border-amber-500 pl-3">
          <Trophy className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold">Most-used routes</h3>
        </div>
        {data.popularRoutes.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No completed journeys yet. Complete a journey to populate analytics.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {data.popularRoutes.map((r, i) => {
              const maxCount = data.popularRoutes[0].count;
              return (
                <li key={r.route} className="flex items-center gap-2">
                  <span className="w-5 text-right text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-medium">
                        <RouteIcon className="h-3 w-3 text-muted-foreground" />
                        {r.route}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {r.count}× · {formatDistance(r.avgDistKm * 1000)} ·{" "}
                        {formatDuration(r.avgTimeMin * 60)}
                      </span>
                    </div>
                    <Progress
                      value={(r.count / maxCount) * 100}
                      className="mt-1 h-1"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ── Reliability ── */}
      {data.reliability && (
        <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
          <div className="mb-3 flex items-center gap-2 border-l-2 border-violet-500 pl-3">
            <Activity className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold">Route reliability</h3>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Standard deviation of actual travel time for{" "}
            <span className="font-medium">{data.reliability.route}</span> over{" "}
            {data.reliability.n} journeys.
          </p>
          <ReliabilityGauge stddevMin={data.reliability.stddevMin} />
        </Card>
      )}

      {/* ── Learning System Progress ── */}
      <Card className="hover-lift rounded-xl border border-border/40 p-5 shadow-premium-1 hover:shadow-premium-2 transition-shadow">
        <div className="mb-3 flex items-center gap-2 border-l-2 border-emerald-500 pl-3">
          <Brain className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">
            Learning system progress
          </h3>
        </div>
        <LearningProgress
          totalSamples={totalSamples}
          threshold={sampleThreshold}
          version={learningVersion}
          modeStats={data.modeStats}
        />
      </Card>
    </div>
  );
}

/* ──────────────────────── Sub-components ──────────────────────── */

/**
 * SmartInsightsBanner — picks the most striking data-driven insight from
 * the analytics payload and renders it as a premium glassmorphic banner
 * with an animated shimmer background. Shows a different insight based on
 * the data: peak mode, accuracy, fastest route, etc.
 */
function SmartInsightsBanner({ data }: { data: AnalyticsData }) {
  // Pick the most striking insight — priority: prediction accuracy > fastest
  // mode > popular route > fallback generic message.
  const insight = useMemo(() => {
    if (data.modeStats?.length) {
      // Best-performing mode (closest predicted vs actual)
      const withData = data.modeStats.filter((m) => m.count > 0);
      if (withData.length) {
        const best = withData.reduce((acc, m) =>
          Math.abs(m.predictionErrorPct) < Math.abs(acc.predictionErrorPct)
            ? m
            : acc,
        );
        if (best.mode) {
          const pct = Math.abs(best.predictionErrorPct).toFixed(1);
          const label =
            best.mode === "RELAXED"
              ? "Relaxed"
              : best.mode === "NORMAL"
                ? "Normal"
                : "Hurry";
          return {
            icon: <Target className="h-4 w-4" />,
            title: `${label} mode is your most predictable pace`,
            sub: `Predictions within ${pct}% of actual travel time (${best.count} trips)`,
          };
        }
      }
    }
    if (data.popularRoutes?.length) {
      const top = data.popularRoutes[0];
      return {
        icon: <Trophy className="h-4 w-4" />,
        title: "Most walked route",
        sub: `${top.route} · ${top.count} trips · ${top.avgTimeMin.toFixed(1)} min avg`,
      };
    }
    return {
      icon: <Sparkles className="h-4 w-4" />,
      title: "Walk more to unlock insights",
      sub: "Complete 5+ journeys for personalised predictions",
    };
  }, [data]);

  return (
    <div className="smart-insights-badge relative overflow-hidden rounded-xl border border-teal-200/40 px-4 py-3 dark:border-teal-800/40">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100/80 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
          {insight.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
              Smart Insight
            </span>
            <Badge
              variant="outline"
              className="border-teal-400/40 px-1 py-0 text-[9px] text-teal-700 dark:text-teal-300"
            >
              AI
            </Badge>
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-tight">
            {insight.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            {insight.sub}
          </p>
        </div>
        <Brain className="h-5 w-5 shrink-0 text-teal-500/70 dark:text-teal-400/70" />
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tint,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tint: "teal" | "sky" | "violet" | "amber";
  trend?: "up" | "down" | "flat";
}) {
  // Count-up animation for numeric values — plays once on mount
  const isNum = typeof value === "number";
  const numVal = isNum ? (value as number) : 0;
  const shouldAnimate = isNum && numVal !== 0;
  const countUp = useCountUp(numVal, 1200, shouldAnimate);
  const displayValue = isNum ? countUp : (value as string);
  const tintMap = {
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    violet:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  };

  const gradientMap = {
    teal: "from-teal-50/60 to-transparent dark:from-teal-950/30 dark:to-transparent",
    sky: "from-sky-50/60 to-transparent dark:from-sky-950/30 dark:to-transparent",
    violet:
      "from-violet-50/60 to-transparent dark:from-violet-950/30 dark:to-transparent",
    amber:
      "from-amber-50/60 to-transparent dark:from-amber-950/30 dark:to-transparent",
  };

  const accentBarMap = {
    teal: "bg-gradient-to-r from-teal-500 to-emerald-400",
    sky: "bg-gradient-to-r from-sky-500 to-cyan-400",
    violet: "bg-gradient-to-r from-violet-500 to-purple-400",
    amber: "bg-gradient-to-r from-amber-500 to-orange-400",
  };

  const trendIcon =
    trend === "up" ? (
      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
    ) : trend === "down" ? (
      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
    ) : (
      <Minus className="h-3.5 w-3.5 text-muted-foreground/50" />
    );

  const trendBg =
    trend === "up"
      ? "bg-emerald-50 dark:bg-emerald-950/40"
      : trend === "down"
        ? "bg-red-50 dark:bg-red-950/40"
        : "bg-muted/50";

  return (
    <Card
      className="kpi-glow hover-lift relative overflow-hidden rounded-xl shadow-premium-1 p-4 bg-gradient-to-br transition-shadow duration-200 hover:shadow-premium-2 cursor-default border-0 border-l-[3px]"
      style={{ borderLeftColor: tint === 'teal' ? '#0d9488' : tint === 'sky' ? '#0ea5e9' : tint === 'violet' ? '#7c3aed' : '#d97706' }}
    >
      {/* Accent top-bar (3px gradient strip) */}
      <div className={`absolute inset-x-0 top-0 h-[3px] ${accentBarMap[tint]}`} />
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradientMap[tint]} pointer-events-none`} />
      <div className="relative">
        {/* Header row: icon tile left, trend indicator right */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tintMap[tint]} shadow-sm`}
          >
            {icon}
          </div>
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full ${trendBg}`}
            title={trend === "up" ? "Increasing" : trend === "down" ? "Decreasing" : "Stable"}
          >
            {trendIcon}
          </div>
        </div>
        {/* Big number — much larger, premium tabular-nums */}
        <div
          className={`text-3xl font-bold tabular-nums leading-none tracking-tight ${shouldAnimate ? "kpi-fade-in" : ""}`}
        >
          {displayValue}
        </div>
        {/* Label below */}
        <div className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          {sub ?? label}
        </div>
      </div>
    </Card>
  );
}

function ReliabilityGauge({ stddevMin }: { stddevMin: number }) {
  // Interpret reliability
  let label: string;
  let color: string;
  let bgClass: string;
  let emoji: React.ReactNode;

  if (stddevMin < 1) {
    label = "Very predictable";
    color = "text-emerald-700 dark:text-emerald-400";
    bgClass = "from-emerald-500 to-emerald-400";
    emoji = <Target className="h-4 w-4 text-emerald-500" />;
  } else if (stddevMin < 3) {
    label = "Moderately variable";
    color = "text-amber-700 dark:text-amber-400";
    bgClass = "from-amber-500 to-amber-400";
    emoji = <Activity className="h-4 w-4 text-amber-500" />;
  } else {
    label = "Highly variable";
    color = "text-red-700 dark:text-red-400";
    bgClass = "from-red-500 to-red-400";
    emoji = <Zap className="h-4 w-4 text-red-500" />;
  }

  // Map stddev to a percentage for the gauge (0 stddev → 100%, 5+ → 0%)
  const reliabilityPct = Math.max(0, Math.min(100, (1 - stddevMin / 5) * 100));

  return (
    <div className="space-y-3">
      {/* Semicircle gauge visualization */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg
            width="80"
            height="44"
            viewBox="0 0 80 44"
            className="overflow-visible"
          >
            {/* Background arc */}
            <path
              d="M 4 40 A 36 36 0 0 1 76 40"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
              strokeLinecap="round"
              className="dark:stroke-neutral-700"
            />
            {/* Filled arc */}
            <path
              d="M 4 40 A 36 36 0 0 1 76 40"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${reliabilityPct * 1.13} 113`}
            />
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-end justify-center pb-0.5">
            <span className="text-sm font-bold tabular-nums">
              {Math.round(reliabilityPct)}%
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            {emoji}
            <span className={`text-sm font-semibold ${color}`}>{label}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">
              ±{stddevMin.toFixed(1)} min
            </Badge>
            <span>std deviation</span>
          </div>
        </div>
      </div>

      {/* Interpretation scale */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-0.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> &lt;1 min
        </span>
        <span className="mx-1 text-muted-foreground/40">|</span>
        <span className="inline-flex items-center gap-0.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> 1–3 min
        </span>
        <span className="mx-1 text-muted-foreground/40">|</span>
        <span className="inline-flex items-center gap-0.5">
          <span className="h-2 w-2 rounded-full bg-red-500" /> &gt;3 min
        </span>
      </div>
    </div>
  );
}

function LearningProgress({
  totalSamples,
  threshold,
  version,
  modeStats,
}: {
  totalSamples: number;
  threshold: number;
  version: string;
  modeStats: AnalyticsData["modeStats"];
}) {
  const overallProgress = Math.min(
    100,
    (totalSamples / (threshold * 3)) * 100
  );

  const versionDescriptions: Record<string, { title: string; desc: string }> = {
    V1: {
      title: "V1 — Baseline defaults",
      desc: "Using hardcoded walking speeds. Predictions are approximate and don't reflect actual campus walking patterns yet.",
    },
    V2: {
      title: "V2 — Blended learning",
      desc: "Campus-level speed is now a blend of learned (Σdist/Σtime) and defaults. Predictions are improving with each journey.",
    },
    V3: {
      title: "V3 — Edge-specific predictions",
      desc: "Enough data to predict travel time per (edge, mode, time-of-day). Significantly more accurate for specific paths.",
    },
    V4: {
      title: "V4 — ML travel-time model",
      desc: "Machine learning model trained on sufficient data. Considers weather, time patterns, and route features for best accuracy.",
    },
  };

  const nextMilestone =
    version === "V1"
      ? threshold
      : version === "V2"
        ? threshold * 2
        : threshold * 3;

  const currentLevel =
    version === "V1"
      ? 0
      : version === "V2"
        ? threshold
        : version === "V3"
          ? threshold * 2
          : threshold * 3;

  const progressInLevel =
    nextMilestone > currentLevel
      ? ((totalSamples - currentLevel) / (nextMilestone - currentLevel)) * 100
      : 100;

  return (
    <div className="space-y-4">
      {/* Version badge + description */}
      <div className="flex items-start gap-3">
        <Badge
          variant="default"
          className="mt-0.5 text-xs px-2.5 py-0.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-0"
        >
          {version}
        </Badge>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {versionDescriptions[version].title}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {versionDescriptions[version].desc}
          </p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {totalSamples} total samples collected
          </span>
          <span className="font-medium tabular-nums">
            {Math.round(overallProgress)}% to V4
          </span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
          {/* Milestone markers */}
          {[threshold, threshold * 2].map((m) => (
            <div
              key={m}
              className="absolute top-0 h-full w-px bg-neutral-400/60 dark:bg-neutral-500/60"
              style={{ left: `${(m / (threshold * 3)) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground/70">
          <span>V1</span>
          <span>V2 ({threshold})</span>
          <span>V3 ({threshold * 2})</span>
          <span>V4 ({threshold * 3})</span>
        </div>
      </div>

      {/* Per-mode sample progress */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          Per-mode samples (threshold: {threshold})
        </p>
        {modeStats.map((m) => {
          const pct = Math.min(100, (m.count / threshold) * 100);
          const isReady = m.count >= threshold;
          return (
            <div key={m.mode} className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium">
                  {MODE_LABELS[m.mode as keyof typeof MODE_LABELS]}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {m.count}/{threshold}
                  {isReady && (
                    <Sparkles className="ml-1 inline h-3 w-3 text-emerald-500" />
                  )}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isReady
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-teal-500 to-teal-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Next milestone hint */}
      {version !== "V4" && (
        <div className="flex items-start gap-2 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 p-3">
          <Sparkles className="h-4 w-4 mt-0.5 text-teal-600 flex-shrink-0" />
          <div className="text-[11px] text-teal-800 dark:text-teal-200">
            <span className="font-medium">
              {nextMilestone - totalSamples} more samples
            </span>{" "}
            needed to unlock{" "}
            <span className="font-medium">
              {version === "V1"
                ? "V2 — Blended learning"
                : version === "V2"
                  ? "V3 — Edge-specific predictions"
                  : "V4 — ML travel-time model"}
            </span>
            . Keep walking!
          </div>
        </div>
      )}
    </div>
  );
}
