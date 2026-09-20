"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CampusMap, type CampusMapHandle } from "@/components/map/campus-map";
import { RoutePlanner } from "@/components/planner/route-planner";
import { WalkingBuddy } from "@/components/planner/walking-buddy";
import { QuickCommute } from "@/components/planner/quick-commute";
import { RouteComparison } from "@/components/route/route-comparison";
import { DirectionsPanel } from "@/components/route/directions-panel";
import { NavigationPanel } from "@/components/navigation/navigation-panel";
import { JourneyHistory } from "@/components/navigation/journey-history";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { ToursPanel } from "@/components/tours/tours-panel";
import { AnnouncementsBanner } from "@/components/announcements/announcements-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { AchievementsPanel } from "@/components/gamification/achievements-panel";
import { ChallengesPanel } from "@/components/gamification/challenges-panel";
import { SafetyPanel } from "@/components/safety/safety-panel";
import { WelcomeDialog } from "@/components/onboarding/welcome-dialog";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAppStore } from "@/hooks/use-app-store";
import { useUrlSync } from "@/hooks/use-url-sync";
import { parseShareUrl } from "@/lib/routing/share-url";
import { useTranslation, LOCALES } from "@/lib/i18n/use-translation";
import { api, type CampusData, type CampusLocation, type AnalyticsData, type WeatherData } from "@/lib/api-client";
import {
  loadSettings,
  DEFAULT_SETTINGS,
  type Settings,
} from "@/lib/settings";
import { recordJourney } from "@/lib/walking-stats";
import { loadStreak } from "@/lib/campus/streak";
import { BADGES } from "@/lib/campus/badges";
import type { MultiRouteResult, RouteResult } from "@/lib/routing/types";
import { useTheme } from "next-themes";
import {
  Footprints,
  Map as MapIcon,
  BarChart3,
  Info,
  Loader2,
  Navigation2,
  History,
  Plus,
  ArrowRight,
  X,
  Sparkles,
  Clock,
  Building2,
  MapPin,
  GraduationCap,
  Share2,
  Link2,
  Languages,
  Compass,
  Siren,
  Layers,
  Wifi,
  Coffee,
  Accessibility,
  Zap,
  Users,
  ShieldAlert,
  CalendarDays as CalendarDaysIcon,
  DoorOpen,
  Star,
  Route,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/lib/routing/types";
import { pathLengthM, haversine } from "@/lib/geo/geo";
import { getPoiDetails, isPoiOpen } from "@/lib/campus/poi-details";
import { hasIndoorPlan } from "@/lib/campus/indoor-plans";
import { IndoorPlanView } from "@/components/map/indoor-plan-view";
import { WeatherWidget } from "@/components/weather-widget";
import { OfflineIndicator } from "@/components/offline-indicator";
import { cn } from "@/lib/utils";
import { SmartSuggestions, type SmartSuggestionData } from "@/components/planner/smart-suggestions";
import { SchedulePanel } from "@/components/schedule/schedule-panel";
import { EventsPanel } from "@/components/events/events-panel";

type Tab = "navigate" | "history" | "analytics" | "tours" | "events";

export default function Home() {
  const store = useAppStore();
  const geo = useGeolocation();
  const { setTheme } = useTheme();
  const { lang, setLang, t } = useTranslation();
  const { updateUrl, copyShareUrl } = useUrlSync();
  const mapRef = useRef<CampusMapHandle>(null);
  const [campus, setCampus] = useState<CampusData | null>(null);
  const [tab, setTab] = useState<Tab>("navigate");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [replayTrace, setReplayTrace] = useState<[number, number][]>([]);
  const [replayLabel, setReplayLabel] = useState<string | null>(null);
  const [poiSelected, setPoiSelected] = useState<CampusLocation | null>(null);
  /** When set, an IndoorPlanView dialog is rendered as a sibling overlay. */
  const [indoorPlanBuilding, setIndoorPlanBuilding] = useState<string | null>(null);
  const [journeyRefreshKey, setJourneyRefreshKey] = useState(0);
  const [activeStep, setActiveStep] = useState<number | undefined>(undefined);
  const [popularRoutesLoading, setPopularRoutesLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  // Active campus tour (drives the Tours tab highlight + via-point of route).
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [activeTourWaypoint, setActiveTourWaypoint] = useState<number | null>(null);
  // Settings state — starts at defaults, hydrates from localStorage on mount.
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  // Achievements panel refresh signal — incremented after each recorded journey.
  const [achievementsRefreshKey, setAchievementsRefreshKey] = useState(0);
  // SOS emergency state
  const [sosActive, setSosActive] = useState(false);
  // Well-lit paths preference for nighttime routing
  const [wellLitPaths, setWellLitPaths] = useState(false);
  // Smart suggestions state
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestionData[]>([]);
  const [smartSuggestionsLoading, setSmartSuggestionsLoading] = useState(false);
  const [smartSuggestionsSource, setSmartSuggestionsSource] = useState<"llm" | "heuristic" | null>(null);

  // Weather impact factor (default 1.0 = no impact)
  const weatherImpactFactor = weatherData?.impactFactor ?? 1.0;

  // Time-of-day greeting (i18n-aware)
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t("greeting.morning");
    if (h < 17) return t("greeting.afternoon");
    return t("greeting.evening");
  }, [t]);

  // Example routes for empty state chips — full friendly labels
  const exampleRoutes = useMemo<
    Array<{ from: string; to: string; label: string }>
  >(
    () => [
      { from: "hostel-3", to: "ab1", label: "Hostel 3 (H3) → Academic Block 1 (AB1)" },
      { from: "library", to: "dining-hall", label: "Library & Learning Resource Centre → Dining Hall (Mess)" },
      { from: "lhc", to: "sports-complex", label: "Lecture Hall Complex (LHC) → Sports Complex" },
    ],
    [],
  );

  // Load campus data once
  useEffect(() => {
    let mounted = true;
    api.campus().then((c) => {
      if (!mounted) return;
      setCampus(c);
      store.setLocations(c.locationList);
      setTimeout(() => {
        mapRef.current?.fitBounds([
          [c.bounds.sw.lng, c.bounds.sw.lat],
          [c.bounds.ne.lng, c.bounds.ne.lat],
        ]);
    //   }, 200);
    // }).catch((e) => console.error("campus load", e));
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load user settings from localStorage on mount and apply defaults.
  // NOTE: URL params override these (applied in the next effect below).
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setSettingsHydrated(true);
    // Apply default walking mode only if URL params don't override
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      if (!urlMode) {
        store.setMode(s.defaultWalkingMode);
      }
    } else {
      store.setMode(s.defaultWalkingMode);
    }
    // Apply default accessibility
    store.setAccessibleOnly(s.defaultAccessibleOnly);
    // Apply theme preference
    if (s.theme === "LIGHT") setTheme("light");
    else if (s.theme === "DARK") setTheme("dark");
    else setTheme("system");
  }, []);

  // Re-apply theme whenever the theme setting changes via SettingsPanel
  useEffect(() => {
    if (!settingsHydrated) return;
    if (settings.theme === "LIGHT") setTheme("light");
    else if (settings.theme === "DARK") setTheme("dark");
    else setTheme("system");
  }, [settings.theme, settingsHydrated, setTheme]);

  // URL deep-link: on initial mount, parse `?from=…&to=…&mode=…&via=…&accessibility=…`
  // (via `parseShareUrl`, which validates slugs against the campus seed and
  // silently drops anything invalid) and pre-fill the planner. We deliberately
  // do NOT auto-trigger a route compute — the user should see the pre-filled
  // state first and decide to click "Find Routes". A toast informs them that
  // the planner was hydrated from a shared link.
  // NOTE: the `tab` query param (legacy, used by some inbound links) is still
  // honoured here so existing bookmarks keep working.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const parsed = parseShareUrl(window.location.search);

    if (parsed.from) store.setFrom(parsed.from);
    if (parsed.to) store.setTo(parsed.to);
    if (parsed.mode) store.setMode(parsed.mode);
    if (parsed.via && parsed.via.length > 0) store.setViaPoints(parsed.via);
    if (parsed.accessible === true) store.setAccessibleOnly(true);

    // Legacy `tab` param (not part of the ShareState schema).
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["navigate", "history", "analytics", "tours"].includes(tabParam)) {
      setTab(tabParam as Tab);
    }

    if (parsed.from && parsed.to) {
      toast.info("Loaded shared route from URL");
    }
  }, []);

  // keep store synced with GPS origin
  useEffect(() => {
    if (store.useGpsOrigin && geo.pos) {
      store.setFromPos(geo.pos);
    }
  }, [geo.pos, store.useGpsOrigin]);

  // While navigating, push GPS samples into the store
  useEffect(() => {
    if (store.journeyId && geo.pos) {
      store.pushGps(geo.pos);
    }
  }, [geo.pos, store.journeyId]);

  // start GPS watch when journey active
  useEffect(() => {
    if (store.journeyId && !geo.watching) geo.start();
    if (!store.journeyId && geo.watching) geo.stop();
  }, [store.journeyId]);

  const selectedRoute: RouteResult | undefined = useMemo(() => {
    if (!store.routes) return undefined;
    const r = store.routes;
    return store.selectedObjective === "FASTEST"
      ? r.fastest
      : store.selectedObjective === "SHORTEST"
        ? r.shortest
        : store.selectedObjective === "EASIEST"
          ? r.easiest
          : r.alternative;
  }, [store.routes, store.selectedObjective]);

  const fromLocation = useMemo(
    () => store.locations.find((l) => l.slug === store.fromSlug),
    [store.locations, store.fromSlug],
  );
  const toLocation = useMemo(
    () => store.locations.find((l) => l.slug === store.toSlug),
    [store.locations, store.toSlug],
  );

  const handleCompute = useCallback(async () => {
    if ((!store.useGpsOrigin && !store.fromSlug) || !store.toSlug) return;
    store.setRoutesLoading(true);
    store.setRoutesError(null);
    setActiveStep(undefined);
    setReplayTrace([]);
    setReplayLabel(null);
    try {
      const r: MultiRouteResult = await api.computeRoutes({
        from: store.useGpsOrigin ? undefined : store.fromSlug ?? undefined,
        to: store.toSlug ?? undefined,
        fromCoord: store.useGpsOrigin ? store.fromPos ?? undefined : undefined,
        mode: store.mode,
        accessibleOnly: store.accessibleOnly,
        // Route customisation (advanced options)
        avoidShaded: store.avoidShaded,
        preferSheltered: store.preferSheltered,
        avoidCrowds: store.avoidCrowds,
        // Filter out empty placeholder strings so we never send them to the API.
        viaPoints: store.viaPoints.filter((v) => v).length > 0
          ? store.viaPoints.filter((v) => v)
          : undefined,
        // Pass the user's custom walking speed (0 = use learned)
        customSpeedMps:
          settings.customWalkingSpeedMps > 0
            ? settings.customWalkingSpeedMps
            : undefined,
      });
      store.setRoutes(r);
      if (!r.fastest && !r.shortest && !r.easiest) {
        toast.error("No walkable route found between these points");
      } else {
        toast.success(t("toast.routesComputed"));
        store.setSelectedObjective("FASTEST");
      }
      // URL bar is kept in sync by the dedicated planner-state effect below —
      // no inline `history.replaceState` here.
    } catch (e) {
      store.setRoutesError(String(e));
      toast.error("Failed to compute routes");
    } finally {
      store.setRoutesLoading(false);
    }
  }, [store, settings.customWalkingSpeedMps, t]);

  // Keep a ref to handleCompute so handlers that run after a setTimeout
  // (tour start, navigate-to-event, POI "Navigate Here") always invoke the
  // freshest closure without re-subscribing listeners.
  const handleComputeRef = useRef(handleCompute);
  useEffect(() => { handleComputeRef.current = handleCompute; }, [handleCompute]);

  // URL deep-link sync: whenever the planner state (from/to/mode/via/accessibility)
  // changes, mirror it into the URL bar so the page is shareable / bookmarkable.
  // `updateUrl` is debounced via `requestAnimationFrame` (see `useUrlSync`) so a
  // burst of store updates coalesces into a single `history.replaceState`.
  // We intentionally skip the very first render so we don't clobber the URL
  // that was just parsed on mount.
  const didMountUrlSyncRef = useRef(false);
  useEffect(() => {
    if (!didMountUrlSyncRef.current) {
      didMountUrlSyncRef.current = true;
      return;
    }
    updateUrl({
      from: store.fromSlug ?? undefined,
      to: store.toSlug ?? undefined,
      mode: store.mode,
      via: store.viaPoints,
      accessible: store.accessibleOnly,
    });
  }, [
    store.fromSlug,
    store.toSlug,
    store.mode,
    store.viaPoints,
    store.accessibleOnly,
    updateUrl,
  ]);

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to compute routes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (
          !store.journeyId &&
          (store.useGpsOrigin || store.fromSlug) &&
          store.toSlug &&
          !store.routesLoading
        ) {
          handleCompute();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, handleCompute]);

  const handleStartJourney = useCallback(async () => {
    if (!selectedRoute || !store.toSlug) {
      await handleCompute();
    }
    const route = selectedRoute ?? store.routes?.fastest;
    if (!route) {
      toast.error("Compute a route first");
      return;
    }
    try {
      const { journeyId } = await api.startJourney({
        from: store.useGpsOrigin ? undefined : store.fromSlug ?? undefined,
        to: store.toSlug ?? undefined,
        mode: store.mode,
        predictedS: route.durationS,
      });
      store.setJourneyId(journeyId);
      store.setPredictedS(route.durationS);
      store.setStartedAt(Date.now());
      store.clearGps();
      geo.start();
      toast.success(t("toast.journeyStarted"));
    } catch {
      toast.error("Failed to start journey");
    }
  }, [selectedRoute, store, handleCompute, geo, t]);

  const handleArrived = useCallback(async () => {
    if (!store.journeyId) return;
    const route = selectedRoute;
    const traceCoords = store.gpsTrace.map((g) => [g.lng, g.lat] as [number, number]);
    const actualM = pathLengthM(traceCoords);
    const actualS = store.startedAt ? (Date.now() - store.startedAt) / 1000 : route?.durationS ?? 0;
    try {
      await api.completeJourney(store.journeyId, {
        status: "COMPLETED",
        actualS,
        actualM,
        gpsTrace: store.gpsTrace.map((g) => ({
          lat: g.lat,
          lng: g.lng,
          accuracyM: g.accuracyM,
          capturedTs: new Date(g.ts).toISOString(),
        })),
      });
      // ── Gamification: record journey + unlock badges ─────────────────
      const { stats: journeyStats, newlyUnlocked } = recordJourney({
        distanceM: actualM > 0 ? actualM : route?.distanceM ?? 0,
        durationS: actualS,
        mode: store.mode,
        accessibleOnly: store.accessibleOnly,
        toSlug: store.toSlug ?? "",
        weatherCondition: weatherData?.condition,
      });
      // Surface celebratory toasts for each newly-unlocked badge
      for (const badge of newlyUnlocked) {
        toast.success(`🎉 Badge unlocked: ${badge.label}!`, {
          description: `${badge.emoji} ${badge.description}`,
        });
      }
      toast.success(
        `Journey recorded · ${actualM > 0 ? (actualM / 1000).toFixed(2) : "?"} km in ${Math.round(actualS / 60)} min. Thank you — predictions improved.`,
      );
      store.refreshStreak(); // update daily walking streak
      // ── Collectible milestone badges (tier-based unlocks) ──────────────
      // Read fresh streak from localStorage — `refreshStreak()` above wrote
      // synchronously so this reflects the post-journey value.
      const freshStreak = loadStreak();
      const completionHour = new Date().getHours();
      const newlyUnlockedBadges = store.unlockBadges({
        journeyCount: journeyStats.totalJourneys,
        totalDistanceM: journeyStats.totalDistanceM,
        currentStreak: freshStreak.currentStreak,
        uniqueLocations: journeyStats.visitedDestinations,
        visitedDiningHall: 0, // visit-count tracking not yet wired up
        visitedLibrary: 0, // visit-count tracking not yet wired up
        hasEarlyJourney: completionHour < 8,
        hasNightJourney: completionHour >= 21,
        hasHurryJourney: store.mode === "HURRY",
        hasRainyJourney: weatherData?.condition === "Rainy",
      });
      for (const id of newlyUnlockedBadges) {
        const badgeDef = BADGES.find((b) => b.id === id);
        if (badgeDef) {
          toast.success(`🏆 Achievement Unlocked: ${badgeDef.name}!`);
        }
      }
      cleanupJourney();
      setJourneyRefreshKey((k) => k + 1);
      setAchievementsRefreshKey((k) => k + 1);
      setAnalytics(null); // force analytics refresh
    } catch {
      toast.error("Failed to record journey");
    }
  }, [store, selectedRoute, weatherData?.condition]);

  function handleAbandon() {
    if (!store.journeyId) return;
    api
      .completeJourney(store.journeyId, { status: "ABANDONED" })
      .catch(() => {})
      .finally(() => {
        toast("Journey abandoned");
        cleanupJourney();
      });
  }

  function cleanupJourney() {
    store.setJourneyId(null);
    store.setStartedAt(null);
    store.clearGps();
    geo.stop();
  }

  // Load analytics on mount so popular routes are available in the planner
  useEffect(() => {
    if (!analytics && !analyticsLoading && !popularRoutesLoading) {
      setPopularRoutesLoading(true);
      api
        .analytics()
        .then((d) => setAnalytics(d))
        .catch(() => {})
        .finally(() => setPopularRoutesLoading(false));
    }
  }, []);

  // load analytics when switching tab (in case it was cleared)
  useEffect(() => {
    if (tab === "analytics" && !analytics && !analyticsLoading) {
      setAnalyticsLoading(true);
      api
        .analytics()
        .then((d) => setAnalytics(d))
        .catch(() => toast.error("Failed to load analytics"))
        .finally(() => setAnalyticsLoading(false));
    }
  }, [tab, analytics, analyticsLoading]);

  const travelledPath: [number, number][] = useMemo(
    () => store.gpsTrace.map((g) => [g.lng, g.lat]),
    [store.gpsTrace],
  );

  // Compute active step segment for map highlighting
  const activeStepElevationSegment: [number, number][] = useMemo(() => {
    if (activeStep === undefined || !selectedRoute?.steps || !selectedRoute.path.length) return [];
    const steps = selectedRoute.steps;
    if (activeStep >= steps.length) return [];
    // Compute the segment of the path that corresponds to this step
    const totalDist = selectedRoute.distanceM;
    const stepStartCum = activeStep > 0 ? steps[activeStep - 1].cumulativeM : 0;
    const stepEndCum = steps[activeStep].cumulativeM;
    const startFrac = stepStartCum / totalDist;
    const endFrac = stepEndCum / totalDist;
    const pathLen = selectedRoute.path.length;
    const startIdx = Math.floor(startFrac * (pathLen - 1));
    const endIdx = Math.min(Math.ceil(endFrac * (pathLen - 1)), pathLen - 1);
    return selectedRoute.path.slice(startIdx, endIdx + 1);
  }, [activeStep, selectedRoute]);

  // when a new route is selected, fit map to its bounds + clear replay
  useEffect(() => {
    if (selectedRoute && selectedRoute.path.length > 1) {
      setReplayTrace([]);
      setReplayLabel(null);
      const lats = selectedRoute.path.map((c) => c[1]);
      const lngs = selectedRoute.path.map((c) => c[0]);
      mapRef.current?.fitBounds([
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ]);
    }
  }, [selectedRoute]);

  // POI click handler — show info card with set-as-from/to actions
  const handlePoiClick = useCallback(
    (slug: string) => {
      const loc = store.locations.find((l) => l.slug === slug);
      if (loc) {
        setPoiSelected(loc);
        mapRef.current?.flyTo(loc.lng, loc.lat, 17);
      }
    },
    [store.locations],
  );

  // Fetch smart suggestions on mount and when route is computed
  useEffect(() => {
    if (smartSuggestionsLoading) return;
    setSmartSuggestionsLoading(true);
    const hour = new Date().getHours();
    const weather = weatherData?.condition ?? "Sunny";
    const journeys = analytics?.popularRoutes?.slice(0, 3).map((r) => r.route).join(", ") ?? "none";
    const location = store.fromSlug ?? "";
    fetch(`/api/smart-suggest?hour=${hour}&weather=${weather}&journeys=${encodeURIComponent(journeys)}&location=${location}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestions) setSmartSuggestions(data.suggestions);
        if (data.source) setSmartSuggestionsSource(data.source);
      })
      .catch(() => {})
      .finally(() => setSmartSuggestionsLoading(false));
  }, []);

  // Refetch smart suggestions when weather data loads or route is computed
  useEffect(() => {
    if (!weatherData || smartSuggestionsLoading) return;
    const hour = new Date().getHours();
    const journeys = analytics?.popularRoutes?.slice(0, 3).map((r) => r.route).join(", ") ?? "none";
    const location = store.fromSlug ?? "";
    fetch(`/api/smart-suggest?hour=${hour}&weather=${weatherData.condition}&journeys=${encodeURIComponent(journeys)}&location=${location}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestions) setSmartSuggestions(data.suggestions);
        if (data.source) setSmartSuggestionsSource(data.source);
      })
      .catch(() => {});
  }, [weatherData]);

  // Handle smart suggestion selection
  const handleSmartSuggestionSelect = useCallback(
    (from: string, to: string) => {
      store.setUseGpsOrigin(false);
      store.setFrom(from);
      store.setTo(to);
      toast.success("Smart route selected — tap Find Routes");
    },
    [store],
  );

  // Handle navigate to class from schedule
  const handleNavigateToClass = useCallback(
    (locationSlug: string) => {
      store.setTo(locationSlug);
      toast.success("Destination set to your next class");
    },
    [store],
  );

  // Handle navigate to event venue from the Events panel.
  // Sets the venue as the destination, clears any via-points, switches to
  // the Navigate tab, and triggers a route compute so the user immediately
  // sees a route from their current "From" to the event venue.
  const handleNavigateToEvent = useCallback(
    (venueSlug: string) => {
      store.setUseGpsOrigin(false);
      store.setTo(venueSlug);
      store.clearViaPoints();
      setTab("navigate");
      setTimeout(() => {
        handleComputeRef.current?.();
      }, 50);
      toast.success("Destination set to event venue");
    },
    [store],
  );

  // Handle "select an event" — fly the map to the event's venue without
  // committing a route. Triggered when the user clicks an event card body
  // (the "Navigate to event" button still routes through
  // `handleNavigateToEvent` above and is excluded via stopPropagation in
  // EventCard). Switches to the Navigate tab so the user can see the map
  // fly to the venue, closes any open POI popup, and toasts a confirmation.
  const handleEventVenueFocus = useCallback(
    (lat: number, lng: number, venueName: string) => {
      setPoiSelected(null);
      setTab("navigate");
      // Smooth 1.5s fly-to (well below the 2s cap in CampusMapHandle.flyTo).
      // rAF delays the call by one frame so the tab switch has a chance to
      // mount the map (it's always mounted in the right column, so this is
      // belt-and-suspenders).
      requestAnimationFrame(() => {
        mapRef.current?.flyTo(lng, lat, 17, 1500);
      });
      toast.info(`Map panned to ${venueName}`);
    },
    [],
  );

  // Popular routes derived from analytics — analytics stores route as
  // `${fromSlug}→${toSlug}` (slug-form, no spaces around →). Look up slugs
  // directly to render friendly labels and pass slugs to the planner.
  const popularRoutes = useMemo<
    Array<{ from: string; to: string; label: string }>
  >(() => {
    if (!analytics?.popularRoutes?.length) return [];
    return analytics.popularRoutes
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((pr) => {
        // route string is like "hostel-3→ab1" — split on arrow (no spaces)
        const parts = pr.route.split("→");
        const fromSlug = (parts[0]?.trim() ?? "").toLowerCase();
        const toSlug = (parts[1]?.trim() ?? "").toLowerCase();
        const fromLoc = store.locations.find((l) => l.slug === fromSlug);
        const toLoc = store.locations.find((l) => l.slug === toSlug);
        const fromLabel = fromLoc?.name ?? fromSlug;
        const toLabel = toLoc?.name ?? toSlug;
        return { from: fromSlug, to: toSlug, label: `${fromLabel} → ${toLabel}` };
      });
  }, [analytics, store.locations]);

  const handleQuickSelect = useCallback(
    (from: string, to: string) => {
      store.setUseGpsOrigin(false);
      store.setFrom(from);
      store.setTo(to);
      toast.success("Route selected — tap Find Routes");
    },
    [store],
  );

  // Journey replay handler
  const handleReplay = useCallback(
    (trace: [number, number][], label: string) => {
      setReplayTrace(trace);
      setReplayLabel(label);
      if (trace.length >= 2) {
        const lngs = trace.map((c) => c[0]);
        const lats = trace.map((c) => c[1]);
        mapRef.current?.fitBounds([
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ]);
      }
      setTab("navigate");
      toast(`Replaying ${label}`);
    },
    [],
  );

  // Step click in directions → fly map to that node
  const handleStepClick = useCallback(
    (idx: number) => {
      setActiveStep(idx);
      const steps = selectedRoute?.steps;
      if (!steps || !steps[idx]) return;
      const nodeSlug = steps[idx].endNodeSlug;
      // find node coords from campus features
      const feat = campus?.network.nodes.features.find(
        (f) => (f.properties as { slug?: string }).slug === nodeSlug,
      );
      if (feat && feat.geometry.type === "Point") {
        const [lng, lat] = feat.geometry.coordinates as [number, number];
        mapRef.current?.flyTo(lng, lat, 18);
      }
    },
    [selectedRoute, campus],
  );

  // Share route handler — flushes any pending URL update, then copies the
  // current shareable URL (origin + pathname + planner-state query string)
  // to the clipboard via `useUrlSync.copyShareUrl()`. Toast feedback on
  // success / failure.
  const handleShare = useCallback(() => {
    copyShareUrl().then(
      () => toast.success("Route link copied to clipboard"),
      () => toast.error("Could not copy link"),
    );
  }, [copyShareUrl]);

  // Bookmark handlers
  const isCurrentBookmarked = useMemo(
    () => store.isBookmarked(store.fromSlug ?? "", store.toSlug ?? ""),
    [store.bookmarks, store.fromSlug, store.toSlug],
  );

  const handleToggleBookmark = useCallback(() => {
    if (!store.fromSlug || !store.toSlug) return;
    if (isCurrentBookmarked) {
      store.removeBookmark(store.fromSlug, store.toSlug);
      toast("Bookmark removed");
    } else {
      const fromName = store.locations.find((l) => l.slug === store.fromSlug)?.name ?? store.fromSlug;
      const toName = store.locations.find((l) => l.slug === store.toSlug)?.name ?? store.toSlug;
      store.addBookmark({
        from: store.fromSlug,
        to: store.toSlug,
        mode: store.mode,
        label: `${fromName} → ${toName}`,
      });
      toast.success("Route bookmarked!");
    }
  }, [store, isCurrentBookmarked]);

  // Start a campus tour: set from/to in the planner, mark the active tour,
  // switch to the Navigate tab, then trigger a route compute.
  const handleStartTour = useCallback(
    (fromSlug: string, toSlug: string, tourId: string) => {
      store.setUseGpsOrigin(false);
      store.setFrom(fromSlug);
      store.setTo(toSlug);
      // Clear any previously-set via points so they don't interfere with the tour's route.
      store.clearViaPoints();
      setActiveTourId(tourId);
      setActiveTourWaypoint(0);
      setTab("navigate");
      // Defer the route compute until after state propagates.
      setTimeout(() => {
        handleComputeRef.current?.();
      }, 50);
      toast.success("Tour started — follow the highlighted route");
    },
    [store],
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Ambient decorative background — subtle radial mesh that adds depth
          without distracting from content. Pointer-events: none so it never
          blocks clicks. Sits behind all content (z -10). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 12% 8%, oklch(0.6 0.12 180 / 0.07), transparent 38%)," +
            "radial-gradient(circle at 88% 14%, oklch(0.65 0.15 160 / 0.07), transparent 42%)," +
            "radial-gradient(circle at 50% 92%, oklch(0.7 0.1 200 / 0.05), transparent 50%)",
        }}
      />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60" style={{ borderBottom: "1px solid transparent", borderImage: "linear-gradient(to right, oklch(0.6 0.12 180 / 0.3), oklch(0.65 0.15 160 / 0.4), oklch(0.6 0.12 180 / 0.3)) 1" }}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-md">
              <Footprints className="h-4.5 w-4.5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-tight">IITGN Walk</h1>
              <p className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
                <Clock className="h-2.5 w-2.5" />
                {greeting} ·
                <span className="relative flex items-center gap-1">
                  Campus Navigation Intelligence
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-teal-500">
                    <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-teal-500 opacity-75" />
                  </span>
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {settings.showWeatherWidget && (
              <WeatherWidget
                compact
                onWeatherLoaded={setWeatherData}
              />
            )}
            {store.journeyId && (
              <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                <span className="mr-1 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-teal-600" />
                live
              </Badge>
            )}
            {replayLabel && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <History className="mr-1 h-3 w-3" />
                replay
                <button
                  className="ml-1 hover:text-emerald-900 dark:hover:text-emerald-100"
                  onClick={() => {
                    setReplayTrace([]);
                    setReplayLabel(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 gap-1"
              onClick={() => {
                // Cycle en → hi → gu → en (LOCALES order, wrapping).
                const idx = LOCALES.findIndex((l) => l.code === lang);
                const next = LOCALES[(idx + 1) % LOCALES.length];
                setLang(next.code);
              }}
              aria-label="Toggle language"
              title={`Switch language — ${LOCALES.filter((l) => l.code !== lang)
                .map((l) => l.label)
                .join(" / ")}`}
            >
              <Languages className="h-4 w-4" />
            </Button>
            <SettingsPanel onSettingsChange={setSettings} />
            <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>About IITGN Walk</DialogTitle>
                </DialogHeader>
                <AboutContent />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Offline indicator — below header, amber banner when offline */}
      <OfflineIndicator />

      {/* Campus announcements — auto-rotating, dismissible banner */}
      <AnnouncementsBanner />

      {/* Main */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-3 pb-4 pt-3 md:grid md:grid-cols-12 md:gap-4">
        {/* Left column */}
        <section className="md:col-span-5 lg:col-span-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="grid w-full grid-cols-4 sm:grid-cols-5">
              <TabsTrigger value="navigate" className="gap-1 text-xs">
                <Navigation2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("tab.navigate")}</span>
              </TabsTrigger>
              <TabsTrigger value="tours" className="gap-1 text-xs">
                <Compass className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("tab.tours")}</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1 text-xs">
                <CalendarDaysIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("tab.events")}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 text-xs">
                <History className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("tab.history")}</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1 text-xs">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("tab.analytics")}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="navigate" className="mt-3 space-y-3">
              {!store.journeyId ? (
                <>
                  <div className="glass-planner kpi-glow rounded-xl border p-5 shadow-premium-1 transition-shadow duration-200 hover:shadow-premium-2">
                    <RoutePlanner
                      locations={store.locations}
                      fromSlug={store.fromSlug}
                      toSlug={store.toSlug}
                      useGpsOrigin={store.useGpsOrigin}
                      gpsSupported={geo.supported}
                      gpsPermission={geo.permission}
                      onFromChange={store.setFrom}
                      onToChange={store.setTo}
                      onUseGpsOrigin={store.setUseGpsOrigin}
                      onLocateMe={() => geo.getCurrent().then((p) => p && store.setFromPos(p))}
                      onSwapFromTo={store.swapFromTo}
                      mode={store.mode}
                      onModeChange={store.setMode}
                      accessibleOnly={store.accessibleOnly}
                      onAccessibleOnlyChange={store.setAccessibleOnly}
                      avoidShaded={store.avoidShaded}
                      preferSheltered={store.preferSheltered}
                      avoidCrowds={store.avoidCrowds}
                      viaPoints={store.viaPoints}
                      onAvoidShadedChange={store.setAvoidShaded}
                      onPreferShelteredChange={store.setPreferSheltered}
                      onAvoidCrowdsChange={store.setAvoidCrowds}
                      onViaPointsChange={store.setViaPoints}
                      onCompute={handleCompute}
                      onStartJourney={handleStartJourney}
                      routesLoading={store.routesLoading}
                      journeyActive={!!store.journeyId}
                      popularRoutes={popularRoutes}
                      onQuickSelect={handleQuickSelect}
                      bookmarks={store.bookmarks}
                      onRemoveBookmark={(from, to) => store.removeBookmark(from, to)}
                    />
                  </div>
                  {/* Walking Buddy pace-matcher — only renders once both
                      endpoints are set. Sits between the planner and the
                      route comparison so the user can pre-tune their pace. */}
                  <WalkingBuddy
                    fromSlug={store.fromSlug}
                    toSlug={store.toSlug}
                    route={selectedRoute ?? null}
                  />
                  {/* Quick Commute — time-aware route suggestions.
                      Renders between Walking Buddy and Route Comparison
                      when no journey is active. */}
                  {!store.journeyId && !store.routes && (
                    <QuickCommute
                      onSelect={(from, to) => {
                        store.setUseGpsOrigin(false);
                        store.setFrom(from);
                        store.setTo(to);
                        toast.success("Commute route selected");
                      }}
                    />
                  )}
                  {store.routes && (
                    <>
                      <RouteComparison
                        routes={store.routes}
                        selectedObjective={store.selectedObjective}
                        onSelect={store.setSelectedObjective}
                        journeyActive={!!store.journeyId}
                        fromSlug={store.fromSlug}
                        toSlug={store.toSlug}
                        isBookmarked={isCurrentBookmarked}
                        onToggleBookmark={handleToggleBookmark}
                        onShare={handleShare}
                        weatherImpactFactor={weatherImpactFactor}
                        units={settings.units}
                        showElevation={settings.showElevationProfile}
                      />
                      {selectedRoute?.steps && selectedRoute.steps.length > 0 && (
                        <DirectionsPanel
                          steps={selectedRoute.steps}
                          activeStep={activeStep}
                          onStepClick={handleStepClick}
                          onActiveStepChange={setActiveStep}
                          journeyActive={!!store.journeyId}
                        />
                      )}
                    </>
                  )}
                  {!store.routes && !store.routesLoading && (
                    <>
                      <div className="rounded-xl border border-dashed bg-gradient-to-br from-teal-50/30 to-emerald-50/20 p-8 text-center dark:from-teal-950/20 dark:to-emerald-950/10">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100/60 dark:bg-teal-950/40">
                          <GraduationCap className="h-8 w-8 animate-gentle-bounce text-teal-600/80" />
                        </div>
                        <p className="text-lg font-semibold">Where are you heading?</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Select start &amp; destination or try a popular route below
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                          {exampleRoutes.map((r) => (
                            <button
                              key={r.label}
                              onClick={() => handleQuickSelect(r.from, r.to)}
                              className="group inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-teal-300/50 bg-teal-50/60 px-3 py-1.5 text-[11px] font-medium text-teal-700 transition-all duration-200 hover:scale-105 hover:bg-teal-100 hover:border-teal-400/60 hover:shadow-premium-1 dark:border-teal-700/50 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/60"
                            >
                              <Footprints className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
                              <span className="truncate">{r.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Smart AI Suggestions */}
                      <SmartSuggestions
                        suggestions={smartSuggestions}
                        loading={smartSuggestionsLoading}
                        source={smartSuggestionsSource}
                        onSelect={handleSmartSuggestionSelect}
                      />
                      {/* Class Schedule Panel */}
                      <SchedulePanel onNavigateToClass={handleNavigateToClass} />
                    </>
                  )}
                </>
              ) : (
                <NavigationPanel
                  journeyId={store.journeyId}
                  fromLocation={fromLocation}
                  toLocation={toLocation}
                  fromPos={store.fromPos}
                  mode={store.mode}
                  route={selectedRoute ?? null}
                  livePos={geo.pos}
                  gpsTrace={store.gpsTrace}
                  startedAt={store.startedAt}
                  onArrived={handleArrived}
                  onAbandon={handleAbandon}
                  gpsError={geo.error}
                  units={settings.units}
                  activeStepIndex={activeStep ?? 0}
                />
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-3 space-y-3">
              <ChallengesPanel refreshKey={achievementsRefreshKey} />
              <AchievementsPanel refreshKey={achievementsRefreshKey} />
              <SafetyPanel
                locations={store.locations}
                userPos={geo.pos ?? store.fromPos}
                wellLitPaths={wellLitPaths}
                onWellLitPathsChange={setWellLitPaths}
                onSosTrigger={() => setSosActive(true)}
              />
              <JourneyHistory
                onReplay={(trace, j) =>
                  handleReplay(
                    trace,
                    `${j.fromLocation ?? "?"} → ${j.toLocation ?? "?"}`,
                  )
                }
                refreshKey={journeyRefreshKey}
              />
            </TabsContent>

            <TabsContent value="analytics" className="mt-3">
              <AnalyticsDashboard data={analytics} loading={analyticsLoading} />
            </TabsContent>

            <TabsContent value="tours" className="mt-3">
              <ToursPanel
                locations={store.locations}
                onStartTour={handleStartTour}
                activeTourId={activeTourId}
                activeWaypointIdx={activeTourWaypoint}
              />
            </TabsContent>

            <TabsContent value="events" className="mt-3">
              <EventsPanel
                onNavigateToVenue={handleNavigateToEvent}
                onEventVenueFocus={handleEventVenueFocus}
                locations={store.locations}
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* Right column: map */}
        <section className="md:col-span-7 lg:col-span-8">
          <div className="relative h-[50vh] min-h-[340px] overflow-hidden rounded-xl border bg-muted/30 shadow-sm md:h-[calc(100vh-7rem)] md:sticky md:top-16">
            {campus ? (
              <CampusMap
                ref={mapRef}
                campus={campus}
                routes={store.routes}
                selectedObjective={store.selectedObjective}
                livePos={geo.pos}
                travelledPath={travelledPath}
                replayTrace={replayTrace}
                activeStepSegment={activeStepElevationSegment}
                onPoiClick={handlePoiClick}
                sosActive={sosActive}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Legend — premium glassmorphic styling with route color dots,
                subtle gradients, and a focus-visible ring for keyboard users. */}
            <div className="pointer-events-auto absolute bottom-3 left-10 rounded-xl border border-border/60 bg-background/85 p-2.5 text-[10px] shadow-premium-2 backdrop-blur-md transition-all duration-200 hover:bg-background/95 focus-within:ring-2 focus-within:ring-teal-400/40">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Route className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Routes
                </span>
              </div>
              <div className="space-y-0.5">
                <LegendRow color="#0d9488" label="Fastest" />
                <LegendRow color="#d97706" label="Shortest" />
                <LegendRow color="#7c3aed" label="Easiest" />
                <LegendRow color="#e11d48" label="Alternative" dashed />
                {replayTrace.length > 0 && (
                  <LegendRow color="#059669" label="Replay trace" dashed />
                )}
              </div>
            </div>

            {/* Walking Buddy overlay — small floating card shown only while
                a journey is active. Mirrors the in-planner panel but is
                constrained in size so it doesn't dominate the map. */}
            {store.journeyId && store.fromSlug && store.toSlug && (
              <div className="absolute left-3 top-3 z-20 max-h-[70vh] w-[260px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl [&>div]:rounded-xl">
                <WalkingBuddy
                  fromSlug={store.fromSlug}
                  toSlug={store.toSlug}
                  route={selectedRoute ?? null}
                />
              </div>
            )}

            {/* POI rich detail card (when a POI is clicked on the map) */}
            {poiSelected && (() => {
              const details = getPoiDetails(poiSelected.slug);
              const openStatus = isPoiOpen(details?.openingHours);
              return (
                <div className="glass absolute right-3 top-3 w-64 max-h-[80vh] overflow-y-auto rounded-xl p-3">
                  <div className="mb-1.5 flex items-start justify-between">
                    <div className="flex items-start gap-1.5">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                      <div>
                        <p className="text-xs font-semibold">{poiSelected.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {CATEGORY_LABELS[poiSelected.category] ?? poiSelected.category}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPoiSelected(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Description */}
                  {details?.description && (
                    <p className="mb-2 text-[10px] leading-snug text-muted-foreground">
                      {details.description}
                    </p>
                  )}
                  {/* Opening hours with open/closed status */}
                  {details?.openingHours && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px]">
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{details.openingHours}</span>
                      <Badge className={cn(
                        "text-[8px] px-1 py-0",
                        openStatus === "open" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                        openStatus === "closed" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" :
                        "bg-muted text-muted-foreground",
                      )}>
                        {openStatus === "open" ? "Open" : openStatus === "closed" ? "Closed" : "Hours vary"}
                      </Badge>
                    </div>
                  )}
                  {/* Amenities as badges */}
                  {details?.amenities && details.amenities.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {details.amenities.map((a) => (
                        <Badge key={a} variant="outline" className="text-[8px] px-1.5 py-0 gap-0.5">
                          {a === "Wi-Fi" && <Wifi className="h-2 w-2" />}
                          {a === "AC" && <Zap className="h-2 w-2" />}
                          {a === "Café" && <Coffee className="h-2 w-2" />}
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* Tags */}
                  {details?.tags && details.tags.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {details.tags.map((tag) => (
                        <Badge key={tag} className="bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[8px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* Capacity + Floor count */}
                  {(details?.capacity || details?.floorCount) && (
                    <div className="mb-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                      {details.capacity && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Cap: {details.capacity}
                        </span>
                      )}
                      {details.floorCount && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {details.floorCount} floor{details.floorCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Departments */}
                  {details?.departments && details.departments.length > 0 && (
                    <div className="mb-1.5">
                      <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">Departments</p>
                      {details.departments.map((d) => (
                        <p key={d} className="text-[10px] text-muted-foreground">• {d}</p>
                      ))}
                    </div>
                  )}
                  {/* Contact */}
                  {details?.contactNumber && (
                    <p className="mb-1.5 flex items-center gap-1 text-[10px]">
                      <ShieldAlert className="h-3 w-3 text-muted-foreground" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">{details.contactNumber}</span>
                    </p>
                  )}
                  {/* Distance from center */}
                  {campus && (
                    <p className="mb-2 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5" />
                      {haversine(
                        { lat: campus.center.lat, lng: campus.center.lng },
                        { lat: poiSelected.lat, lng: poiSelected.lng },
                      ).toFixed(0)}m from center
                    </p>
                  )}
                  {/* Action buttons */}
                  <div className="flex gap-1.5">
                    {/* Star / Favorite toggle — placed FIRST so it's prominent.
                        Filled amber when favorited, outline when not. */}
                    {(() => {
                      const fav = store.isFavorite(poiSelected.slug);
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-7 w-7 shrink-0 p-0",
                            fav
                              ? "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-950/70"
                              : "text-muted-foreground hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:hover:border-amber-800 dark:hover:bg-amber-950/30 dark:hover:text-amber-300",
                          )}
                          onClick={() => {
                            const wasFav = store.isFavorite(poiSelected.slug);
                            store.toggleFavorite(poiSelected.slug);
                            toast.success(
                              wasFav ? "Removed from favorites" : "Added to favorites",
                            );
                          }}
                          aria-label={
                            fav ? "Remove from favorites" : "Add to favorites"
                          }
                          aria-pressed={fav}
                          title={fav ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star
                            className={cn(
                              "h-3.5 w-3.5",
                              fav && "fill-amber-500 text-amber-500",
                            )}
                          />
                        </Button>
                      );
                    })()}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 gap-1 text-[11px]"
                      onClick={() => {
                        store.setUseGpsOrigin(false);
                        store.setFrom(poiSelected.slug);
                        setPoiSelected(null);
                        toast.success(`From set to ${poiSelected.name}`);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      From
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 flex-1 gap-1 bg-teal-700 text-[11px] hover:bg-teal-800"
                      onClick={() => {
                        store.setTo(poiSelected.slug);
                        setPoiSelected(null);
                        toast.success(`To set to ${poiSelected.name}`);
                      }}
                    >
                      <ArrowRight className="h-3 w-3" />
                      To
                    </Button>
                  </div>
                  {/* Navigate button */}
                  <Button
                    size="sm"
                    className="mt-1.5 w-full gap-1.5 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700"
                    onClick={() => {
                      store.setTo(poiSelected.slug);
                      setPoiSelected(null);
                      handleComputeRef.current?.();
                      toast.success(`Navigating to ${poiSelected.name}`);
                    }}
                  >
                    <Navigation2 className="h-3 w-3" />
                    Navigate Here
                  </Button>
                  {/* View Floor Plan button — only when this building has an indoor plan */}
                  {hasIndoorPlan(poiSelected.slug) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1.5 w-full gap-1.5 border-teal-300 bg-teal-50 text-[11px] text-teal-800 hover:bg-teal-100 hover:text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-900/60"
                      onClick={() => {
                        setIndoorPlanBuilding(poiSelected.slug);
                        setPoiSelected(null);
                      }}
                    >
                      <DoorOpen className="h-3 w-3" />
                      View Floor Plan
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Map actions: recenter + share */}
            <div className="absolute right-3 top-3 flex gap-1.5">
              {geo.pos && !poiSelected && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 shadow-sm"
                  onClick={() => mapRef.current?.flyTo(geo.pos!.lng, geo.pos!.lat, 18)}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Recenter
                </Button>
              )}
              {store.fromSlug && store.toSlug && !poiSelected && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 shadow-sm"
                  onClick={handleShare}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Indoor Floor Plan modal — sibling overlay rendered when a building
          with an indoor plan is selected via the POI popup's "View Floor Plan"
          button. Self-contained Dialog (radix portal). */}
      {indoorPlanBuilding && (
        <IndoorPlanView
          buildingSlug={indoorPlanBuilding}
          onClose={() => setIndoorPlanBuilding(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t bg-card/80 backdrop-blur-sm" style={{ borderTop: "1px solid transparent", borderImage: "linear-gradient(to right, oklch(0.6 0.12 180 / 0.3), oklch(0.65 0.15 160 / 0.4), oklch(0.6 0.12 180 / 0.3)) 1" }}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-2 px-4 py-3 text-[11px] text-muted-foreground sm:grid-cols-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:justify-start justify-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-teal-600 to-emerald-700 text-white">
              <Footprints className="h-2.5 w-2.5" />
            </span>
            <span>
              <span className="font-medium text-foreground/80">IITGN Walk</span> · Campus Navigation
            </span>
          </div>
          <div className="text-center">
            <span className="font-medium text-foreground/80">Routing:</span>{" "}
            Dijkstra + A* · Self-contained GeoJSON
          </div>
          <div className="text-center sm:text-right">
            <span className="font-medium text-foreground/80">Learning:</span>{" "}
            Σdist/Σtime campus speed adaptation
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 border-t px-4 py-2 text-center text-[10px] text-muted-foreground/70 sm:flex-row sm:justify-between sm:text-left">
          <p className="flex items-center justify-center gap-1 sm:justify-start">
            <Footprints className="h-3 w-3" />
            IITGN Walk © {new Date().getFullYear()}
          </p>
          <p>
            Seed dataset is representative —{" "}
            <span className="font-medium text-foreground/50">
              replace with verified geospatial data before production use
            </span>
          </p>
        </div>
      </footer>

      {/* Onboarding welcome dialog — shows only on first visit */}
      <WelcomeDialog />

      {/* SOS FAB (floating action button) — always accessible */}
      <button
        type="button"
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300",
          sosActive
            ? "bg-red-600 text-white scale-110 shadow-red-600/40"
            : "bg-red-500 text-white hover:scale-105 hover:bg-red-600 shadow-red-500/30",
        )}
        onClick={() => {
          if (sosActive) {
            setSosActive(false);
          } else {
            setTab("history");
          }
        }}
        aria-label={sosActive ? "Cancel SOS" : "Emergency SOS"}
      >
        {sosActive ? (
          <X className="h-6 w-6" />
        ) : (
          <Siren className="h-6 w-6 animate-pulse" />
        )}
        {sosActive && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="inline-flex h-4 w-4 rounded-full bg-red-500" />
          </span>
        )}
      </button>
    </div>
  );
}

function LegendRow({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span
        className="inline-block h-2.5 w-5 rounded-full"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 6px)`
            : color,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function AboutContent() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      <p>
        <strong className="text-foreground">IITGN Walk</strong> is a
        campus-specific walking navigation platform for IIT Gandhinagar. Unlike
        generic map apps, the routing graph is built from IITGN&apos;s internal
        roads, paths and decision nodes — not third-party street tiles.
      </p>
      <ul className="ml-4 list-disc space-y-1">
        <li>
          <strong className="text-foreground">Multi-objective routing:</strong>{" "}
          computes fastest, shortest, easiest and one alternative route
          simultaneously — the shortest route is not assumed to be the fastest.
        </li>
        <li>
          <strong className="text-foreground">Turn-by-turn directions:</strong>{" "}
          every route comes with landmark-based walking steps.
        </li>
        <li>
          <strong className="text-foreground">Mode-aware ETAs:</strong> Relaxed /
          Normal / Hurry profiles, each with a tunable default speed.
        </li>
        <li>
          <strong className="text-foreground">Accessibility filter:</strong>{" "}
          toggle to exclude routes with stairs and unpaved surfaces.
        </li>
        <li>
          <strong className="text-foreground">Continuous learning:</strong> after
          each completed journey the campus-level walking speed is recomputed as
          Σdistance / Σtime, blended with defaults until enough samples exist.
        </li>
        <li>
          <strong className="text-foreground">Journey history &amp; replay:</strong>{" "}
          past walks are stored and can be replayed on the map.
        </li>
        <li>
          <strong className="text-foreground">Click-to-plan:</strong> tap any
          building on the map to set it as your start or destination.
        </li>
        <li>
          <strong className="text-foreground">Share &amp; bookmark:</strong>{" "}
          share route links and bookmark your favourite routes for quick access.
        </li>
        <li>
          <strong className="text-foreground">Map layer controls:</strong>{" "}
          toggle visibility of buildings, paths, green areas, POIs, and network nodes.
        </li>
        <li>
          <strong className="text-foreground">Privacy-first:</strong> only
          anonymised GPS coordinates, timestamps and mode are stored.
        </li>
        <li>
          <strong className="text-foreground">Modular:</strong> the map, routing
          engine, API, database and analytics are independent and replaceable.
        </li>
      </ul>
      <p className="rounded-lg border bg-muted/40 p-2 text-xs">
        The campus network shown here is a manually-entered seed reconstruction.
        Replace the seed data with a verified survey to go to production.
      </p>
    </div>
  );
}
