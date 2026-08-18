"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from "react";
import { Plus, Minus, Compass, Box, Eye, EyeOff, Layers, Activity, Shield } from "lucide-react";
import type { CampusData, CampusActivityData, ActiveWalker, HeatCell } from "@/lib/api-client";
import type { MultiRouteResult } from "@/lib/routing/types";
import type { GeoPos } from "@/hooks/use-geolocation";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface CampusMapHandle {
  /**
   * Smoothly fly the map to a target center.
   *
   * @param lng       target longitude
   * @param lat       target latitude
   * @param zoom      target zoom level (defaults to 17 — building-level detail)
   * @param duration   animation duration in ms (defaults to 800; capped at
   *                   2000 internally so callers can't make users wait long)
   */
  flyTo: (lng: number, lat: number, zoom?: number, duration?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
  getMap: () => maplibregl.Map | null;
}

interface Props {
  campus: CampusData | null;
  routes: MultiRouteResult | null;
  selectedObjective: "FASTEST" | "SHORTEST" | "EASIEST" | "ALTERNATIVE";
  livePos: GeoPos | null;
  travelledPath: [number, number][];
  /** a past journey's GPS trace being replayed on the map (overview mode) */
  replayTrace?: [number, number][];
  /** whether to show POI markers as interactive (with popups) */
  interactive?: boolean;
  /** active step segment coordinates to highlight on the map */
  activeStepSegment?: [number, number][];
  /** Whether SOS emergency mode is active (pulsing red indicator) */
  sosActive?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
  onPoiClick?: (locationSlug: string) => void;
}

const ROUTE_COLORS = {
  FASTEST: "#0d9488", // teal-600
  SHORTEST: "#d97706", // amber-600
  EASIEST: "#7c3aed", // violet-600
  ALTERNATIVE: "#e11d48", // rose-600 (non-blue accent)
} as const;

const CATEGORY_COLORS: Record<string, string> = {
  HOSTEL: "#dc2626",
  ACADEMIC: "#0d9488",
  CLASSROOM: "#0d9488",
  LAB: "#0891b2",
  LIBRARY: "#7c3aed",
  SPORTS: "#16a34a",
  DINING: "#ca8a04",
  ADMIN: "#475569",
  GATE: "#b91c1c",
  LANDMARK: "#9333ea",
  OTHER: "#64748b",
};

/** Default heights (metres) per building category — used when a feature has
 *  no `properties.height`. Values are representative of typical IITGN
 *  building heights. */
const BUILDING_HEIGHTS: Record<string, number> = {
  HOSTEL: 12,
  ACADEMIC: 15,
  CLASSROOM: 14,
  LAB: 15,
  LIBRARY: 18,
  SPORTS: 8,
  DINING: 6,
  ADMIN: 10,
  GATE: 4,
  LANDMARK: 5,
  OTHER: 9,
};

/** Map a building name → category (used to colour + size 3D extrusions). */
function categoryFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("library")) return "LIBRARY";
  if (n.includes("lhc") || n.includes("lecture")) return "CLASSROOM";
  if (n.includes("ab") || n.includes("academic")) return "ACADEMIC";
  if (n.includes("hostel")) return "HOSTEL";
  if (n.includes("computer")) return "LAB";
  if (n.includes("admin")) return "ADMIN";
  if (n.includes("health")) return "OTHER";
  if (n.includes("dining") || n.includes("mess")) return "DINING";
  if (n.includes("shopping")) return "LANDMARK";
  if (n.includes("sports") || n.includes("gym")) return "SPORTS";
  return "OTHER";
}

/** Derive a default building height (m) from its name. */
function deriveHeight(name: string): number {
  const cat = categoryFromName(name);
  return BUILDING_HEIGHTS[cat] ?? 9;
}

/**
 * Enrich the campus dataset by adding `height` + `category` properties to
 * each building feature (used for 3D extrusion + colour matching). Features
 * that already have a `height` property keep their original value.
 */
function enrichCampusData(campus: CampusData): CampusData {
  const buildings: GeoJSON.FeatureCollection = {
    ...campus.buildings,
    features: campus.buildings.features.map((f) => {
      const props = (f.properties ?? {}) as {
        name?: string;
        height?: number;
        [k: string]: unknown;
      };
      const name = props.name ?? "";
      const height = props.height ?? deriveHeight(name);
      const category = categoryFromName(name);
      return {
        ...f,
        properties: { ...props, height, category },
      } as GeoJSON.Feature;
    }),
  };
  return { ...campus, buildings };
}

/* ── Layer toggle definitions ── */
const LAYER_GROUPS = [
  {
    id: "buildings",
    label: "Buildings",
    layers: ["buildings-fill", "buildings-outline", "buildings-label", "3d-buildings", "building-shadows"],
  },
  { id: "greens", label: "Green Areas", layers: ["greens-fill", "greens-outline"] },
  { id: "paths", label: "Paths & Roads", layers: ["edges-road", "edges-path"] },
  {
    id: "pois",
    label: "POI Markers",
    layers: ["locations-halo", "locations-dot", "locations-label", "clusters-circle", "clusters-count"],
  },
  { id: "nodes", label: "Network Nodes", layers: ["nodes-decision"] },
] as const;

type LayerGroupId = (typeof LAYER_GROUPS)[number]["id"];

/** Theme-aware paint colours for the map's "background" layer. Updated live
 *  when the user toggles light/dark mode (see MutationObserver in init). */
const BG_LIGHT = "#eef3ec";
const BG_DARK = "#0f1611";

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function buildStyle(campus: CampusData): maplibregl.StyleSpecification {
  return {
    version: 8,
    name: "IITGN Campus",
    sources: {
      buildings: { type: "geojson", data: campus.buildings },
      "network-edges": { type: "geojson", data: campus.network.edges },
      "network-nodes": { type: "geojson", data: campus.network.nodes },
      locations: {
        type: "geojson",
        data: campus.locations,
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 16,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": isDarkMode() ? BG_DARK : BG_LIGHT },
      },
      // greens / courts / sports drawn first (under buildings)
      {
        id: "greens-fill",
        type: "fill",
        source: "buildings",
        filter: ["in", ["get", "kind"], ["literal", ["GREEN", "SPORTS", "COURT", "WATER"]]],
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#cdebc4"],
          "fill-opacity": 0.9,
        },
      },
      // ── Building shadows ── SW-offset, blurred, soft-black fill. Hidden
      // until zoom>15 + sun-up (toggled from JS). Drawn UNDER buildings so
      // the shadow peeks out from the SW side.
      {
        id: "building-shadows",
        type: "fill",
        source: "buildings",
        filter: ["==", ["get", "kind"], "BUILDING"],
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#000000",
          "fill-opacity": 0.15,
          // screen-space offset: [x, y] = [west(-), south(+)] ⇒ SW
          "fill-translate": [-3, 4],
          "fill-translate-anchor": "map",
        },
      },
      {
        id: "buildings-fill",
        type: "fill",
        source: "buildings",
        filter: ["==", ["get", "kind"], "BUILDING"],
        paint: {
          "fill-color": "#dcd6cc",
          "fill-opacity": 0.95,
        },
      },
      {
        id: "buildings-outline",
        type: "line",
        source: "buildings",
        filter: ["==", ["get", "kind"], "BUILDING"],
        paint: { "line-color": "#7a7468", "line-width": 1 },
      },
      {
        id: "greens-outline",
        type: "line",
        source: "buildings",
        filter: ["in", ["get", "kind"], ["literal", ["GREEN", "SPORTS", "COURT", "WATER"]]],
        paint: { "line-color": "#7a8a5a", "line-width": 0.6, "line-dasharray": [2, 1] },
      },
      // ── 3D building extrusion ── only visible when pitch > 0 (toggled
      // from JS). When visible, hide the flat `buildings-fill` layer to
      // avoid z-fighting and let the extrusion's top face take over.
      {
        id: "3d-buildings",
        type: "fill-extrusion",
        source: "buildings",
        filter: ["==", ["get", "kind"], "BUILDING"],
        layout: { visibility: "none" },
        paint: {
          "fill-extrusion-color": [
            "coalesce",
            ["get", "color"],
            [
              "match",
              ["get", "category"],
              "HOSTEL", CATEGORY_COLORS.HOSTEL,
              "ACADEMIC", CATEGORY_COLORS.ACADEMIC,
              "CLASSROOM", CATEGORY_COLORS.CLASSROOM,
              "LAB", CATEGORY_COLORS.LAB,
              "LIBRARY", CATEGORY_COLORS.LIBRARY,
              "SPORTS", CATEGORY_COLORS.SPORTS,
              "DINING", CATEGORY_COLORS.DINING,
              "ADMIN", CATEGORY_COLORS.ADMIN,
              "GATE", CATEGORY_COLORS.GATE,
              "LANDMARK", CATEGORY_COLORS.LANDMARK,
              "#d9d6cf",
            ],
          ],
          "fill-extrusion-height": ["coalesce", ["get", "height"], 9],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.88,
          // smooth transition when toggling 3D mode / changing pitch
          "fill-extrusion-opacity-transition": { duration: 300, delay: 0 },
          "fill-extrusion-height-transition": { duration: 300, delay: 0 },
        },
      },
      // network edges — improved contrast (darker, thicker)
      {
        id: "edges-road",
        type: "line",
        source: "network-edges",
        filter: ["in", ["get", "roadType"], ["literal", ["ROAD"]]],
        paint: {
          "line-color": "#a8a397",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 2, 17, 4.5],
        },
      },
      {
        id: "edges-path",
        type: "line",
        source: "network-edges",
        filter: ["in", ["get", "roadType"], ["literal", ["PATH", "INTERNAL", "SERVICE"]]],
        paint: {
          "line-color": "#b8b1a2",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 1.4, 17, 3],
          "line-dasharray": [1, 0.6],
        },
      },
      // network nodes — only show decision/landmark/gate nodes (hide plain intersections)
      {
        id: "nodes-decision",
        type: "circle",
        source: "network-nodes",
        filter: ["in", ["get", "kind"], ["literal", ["DECISION", "LANDMARK", "GATE"]]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 2, 17, 4],
          "circle-color": "#334155",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1,
        },
      },
      // ── POI clustering ── cluster circles shown for clustered points
      {
        id: "clusters-circle",
        type: "circle",
        source: "locations",
        filter: ["has", "point_count"],
        paint: {
          // size grows with point count
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14, // 0–4  points
            5, 18, // 5–9  points
            10, 22, // 10–14 points
            15, 26, // 15+ points
          ],
          "circle-color": "#0d9488",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-opacity": 0.9,
        },
      },
      // cluster count label (white text inside teal circle)
      {
        id: "clusters-count",
        type: "symbol",
        source: "locations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
          "text-font": ["sans"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0)",
          "text-halo-width": 0,
        },
      },
      // locations: coloured circle by category (UNCLUSTERED only — hide when in a cluster)
      {
        id: "locations-halo",
        type: "circle",
        source: "locations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 5, 17, 10],
          "circle-color": [
            "match",
            ["get", "category"],
            "HOSTEL", CATEGORY_COLORS.HOSTEL,
            "ACADEMIC", CATEGORY_COLORS.ACADEMIC,
            "CLASSROOM", CATEGORY_COLORS.CLASSROOM,
            "LAB", CATEGORY_COLORS.LAB,
            "LIBRARY", CATEGORY_COLORS.LIBRARY,
            "SPORTS", CATEGORY_COLORS.SPORTS,
            "DINING", CATEGORY_COLORS.DINING,
            "ADMIN", CATEGORY_COLORS.ADMIN,
            "GATE", CATEGORY_COLORS.GATE,
            "LANDMARK", CATEGORY_COLORS.LANDMARK,
            "#64748b",
          ],
          "circle-opacity": 0.25,
        },
      },
      {
        id: "locations-dot",
        type: "circle",
        source: "locations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 2.5, 17, 4.5],
          "circle-color": [
            "match",
            ["get", "category"],
            "HOSTEL", CATEGORY_COLORS.HOSTEL,
            "ACADEMIC", CATEGORY_COLORS.ACADEMIC,
            "CLASSROOM", CATEGORY_COLORS.CLASSROOM,
            "LAB", CATEGORY_COLORS.LAB,
            "LIBRARY", CATEGORY_COLORS.LIBRARY,
            "SPORTS", CATEGORY_COLORS.SPORTS,
            "DINING", CATEGORY_COLORS.DINING,
            "ADMIN", CATEGORY_COLORS.ADMIN,
            "GATE", CATEGORY_COLORS.GATE,
            "LANDMARK", CATEGORY_COLORS.LANDMARK,
            "#64748b",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.2,
        },
      },
      {
        id: "locations-label",
        type: "symbol",
        source: "locations",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 8, 15, 10, 17, 13],
          "text-anchor": "top",
          "text-offset": [0, 0.4],
          "text-font": ["sans"],
        },
        paint: {
          "text-halo-color": "#ffffff",
          "text-halo-width": 2.0, // improved halo for legibility
          "text-color": "#1f2937",
        },
      },
      {
        id: "buildings-label",
        type: "symbol",
        source: "buildings",
        filter: ["==", ["get", "kind"], "BUILDING"],
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 13, 7, 15, 9, 17, 12],
          "text-anchor": "center",
          "text-font": ["sans"],
        },
        paint: {
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.8, // improved halo
          "text-color": "#374151",
        },
      },
    ],
  };
}

export const CampusMap = forwardRef<CampusMapHandle, Props>(function CampusMap(
  { campus, routes, selectedObjective, livePos, travelledPath, replayTrace, activeStepSegment, sosActive, onMapReady, onPoiClick },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerGroupId, boolean>>({
    buildings: true,
    greens: true,
    paths: true,
    pois: true,
    nodes: true,
  });
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [mapZoom, setMapZoom] = useState(16);
  // Live Activity state
  const [showActivity, setShowActivity] = useState(false);
  const [activityData, setActivityData] = useState<CampusActivityData | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // Pre-compute enriched campus data (adds `height` + `category` to each
  // building feature so the 3D-extrusion layer can read them).
  const enrichedCampus = useMemo(() => (campus ? enrichCampusData(campus) : null), [campus]);

  const handleZoomIn = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.zoomIn({ duration: 200 });
  }, []);

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.zoomOut({ duration: 200 });
  }, []);

  const handleToggle3D = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const newPitch = pitch > 0 ? 0 : 45;
    map.easeTo({ pitch: newPitch, duration: 300 });
    setPitch(newPitch);
  }, [pitch]);

  const toggleLayer = useCallback((groupId: LayerGroupId) => {
    const map = mapRef.current;
    if (!map) return;

    setLayerVisibility((prev) => {
      const newVis = !prev[groupId];
      const group = LAYER_GROUPS.find((g) => g.id === groupId);
      if (group) {
        for (const layerId of group.layers) {
          try {
            map.setLayoutProperty(layerId, "visibility", newVis ? "visible" : "none");
          } catch {
            // layer may not exist yet
          }
        }
      }
      return { ...prev, [groupId]: newVis };
    });
  }, []);

  useImperativeHandle(ref, () => ({
    flyTo: (lng, lat, zoom, duration) => {
      // Cap duration at 2000ms so callers can't accidentally freeze the UI.
      const dur = Math.min(duration ?? 800, 2000);
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: zoom ?? 17,
        duration: dur,
        essential: true,
      });
    },
    fitBounds: (bounds) => {
      mapRef.current?.fitBounds(bounds, { padding: 40, duration: 600 });
    },
    getMap: () => mapRef.current,
  }));

  /** Toggle 3D extrusion vs flat building layer based on current pitch. */
  const applyPitchVisibility = useCallback((p: number) => {
    const map = mapRef.current;
    if (!map) return;
    const show3d = p > 0;
    try {
      map.setLayoutProperty("3d-buildings", "visibility", show3d ? "visible" : "none");
      // When 3D is active, hide the flat fill (keep outline for crisp edges).
      map.setLayoutProperty("buildings-fill", "visibility", show3d ? "none" : "visible");
      // Also hide building-shadows in 3D (extrusion already casts implicit depth).
      map.setLayoutProperty("building-shadows", "visibility", show3d ? "none" : (map.getZoom() > 15 ? "visible" : "none"));
    } catch {
      // layers may not exist yet
    }
  }, []);

  /** Toggle shadow layer based on zoom + sun-up (current local hour 6–18). */
  const applyZoomShadowVisibility = useCallback((zoom: number) => {
    const map = mapRef.current;
    if (!map) return;
    const hour = new Date().getHours();
    const sunUp = hour >= 6 && hour <= 18;
    const showShadows = zoom > 15 && sunUp && pitch === 0;
    try {
      map.setLayoutProperty("building-shadows", "visibility", showShadows ? "visible" : "none");
    } catch {
      // layer may not exist
    }
  }, [pitch]);

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !enrichedCampus) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(enrichedCampus),
      center: [enrichedCampus.center.lng, enrichedCampus.center.lat],
      zoom: 16,
      minZoom: 14,
      maxZoom: 19,
      attributionControl: false,
      // antialias is supported at the WebGL canvas level but not declared in
      // maplibre-gl's MapOptions type; suppress the type error deliberately.
      // @ts-expect-error — antialias is a valid WebGLCanvasContextOption.
      antialias: true,
    });
    // Track bearing for compass indicator
    map.on("rotate", () => setBearing(map.getBearing()));
    map.on("pitch", () => {
      const p = map.getPitch();
      setPitch(p);
      applyPitchVisibility(p);
    });
    map.on("zoom", () => {
      const z = map.getZoom();
      setMapZoom(z);
      applyZoomShadowVisibility(z);
    });
    // Initial shadow visibility
    map.on("load", () => {
      applyZoomShadowVisibility(map.getZoom());
      // add empty sources for routes + GPS — added/replaced later
      map.addSource("route-selected", { type: "geojson", data: emptyFC() });
      map.addSource("route-others", { type: "geojson", data: emptyFC() });
      map.addSource("gps-pos", { type: "geojson", data: emptyFC() });
      map.addSource("gps-trail", { type: "geojson", data: emptyFC() });
      map.addSource("replay-trace", { type: "geojson", data: emptyFC() });
      map.addSource("replay-endpoints", { type: "geojson", data: emptyFC() });
      map.addSource("active-step", { type: "geojson", data: emptyFC() });

      // Configure route line transitions for smooth fade-in.
      // When the source data changes, opacity animates over 600ms.
      try {
        map.setPaintProperty("route-selected-line", "line-opacity-transition", { duration: 500, delay: 0 });
        map.setPaintProperty("route-others-line", "line-opacity-transition", { duration: 500, delay: 0 });
      } catch {
        // layers added below
      }

      map.addLayer({
        id: "route-others-line",
        type: "line",
        source: "route-others",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 3, 17, 5],
          "line-opacity": 0.35,
          "line-opacity-transition": { duration: 500, delay: 0 },
        },
      });
      map.addLayer({
        id: "route-selected-casing",
        type: "line",
        source: "route-selected",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 8, 17, 13],
          "line-opacity-transition": { duration: 500, delay: 0 },
        },
      });
      map.addLayer({
        id: "route-selected-line",
        type: "line",
        source: "route-selected",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 4, 17, 7],
          "line-opacity-transition": { duration: 500, delay: 0 },
        },
      });
      // GPS trail (travelled path)
      map.addLayer({
        id: "gps-trail-line",
        type: "line",
        source: "gps-trail",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#0ea5e9",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 2, 17, 4],
          "line-dasharray": [0.5, 1],
        },
      });
      // GPS pulse ring — a second, larger, very-low-opacity halo. Its
      // radius is animated by a rAF loop (see below) to give a pulsing effect.
      map.addLayer({
        id: "gps-pos-pulse",
        type: "circle",
        source: "gps-pos",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 14, 17, 28],
          "circle-color": "#0ea5e9",
          "circle-opacity": 0,
          "circle-opacity-transition": { duration: 200, delay: 0 },
          "circle-stroke-color": "#0ea5e9",
          "circle-stroke-width": 0,
        },
      });
      // GPS position halo + dot
      map.addLayer({
        id: "gps-pos-halo",
        type: "circle",
        source: "gps-pos",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 14, 17, 26],
          "circle-color": "#0ea5e9",
          "circle-opacity": 0.22,
        },
      });
      map.addLayer({
        id: "gps-pos-dot",
        type: "circle",
        source: "gps-pos",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 5, 17, 8],
          "circle-color": "#0284c7",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });
      // Replay trace (a past journey's GPS path) — dashed emerald line
      map.addLayer({
        id: "replay-trace-line",
        type: "line",
        source: "replay-trace",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#059669",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 3, 17, 5],
          "line-opacity": 0.9,
          "line-dasharray": [1, 0.4],
        },
      });
      // Replay endpoints (start ◆ + end ●)
      map.addLayer({
        id: "replay-end-start",
        type: "circle",
        source: "replay-endpoints",
        filter: ["==", ["get", "role"], "start"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 5, 17, 8],
          "circle-color": "#059669",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "replay-end-end",
        type: "circle",
        source: "replay-endpoints",
        filter: ["==", ["get", "role"], "end"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 6, 17, 10],
          "circle-color": "#dc2626",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      // Active step segment — bright animated line
      map.addLayer({
        id: "active-step-casing",
        type: "line",
        source: "active-step",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 10, 17, 16],
        },
      });
      map.addLayer({
        id: "active-step-line",
        type: "line",
        source: "active-step",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#14b8a6",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 6, 17, 10],
          "line-opacity": 0.9,
        },
      });

      // ── POI interactions ──
      // 1. Click an unclustered POI → call onPoiClick(slug)
      if (onPoiClick) {
        map.on("click", "locations-dot", (ev: maplibregl.MapMouseEvent & { features?: unknown }) => {
          const feats = (ev as unknown as { features?: Array<{ properties: { slug?: string } }> }).features;
          const slug = feats && feats[0] && feats[0].properties && feats[0].properties.slug;
          if (slug) onPoiClick(slug);
        });
        map.on("mouseenter", "locations-dot", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "locations-dot", () => {
          map.getCanvas().style.cursor = "";
        });
      }
      // 2. Click a cluster → animate zoom into the cluster's expansion zoom
      map.on("click", "clusters-circle", (ev: maplibregl.MapMouseEvent & { features?: unknown }) => {
        const feats = (ev as unknown as {
          features?: Array<{
            properties: { cluster_id?: number; point_count?: number; cluster?: boolean };
            geometry: { coordinates: [number, number] };
          }>;
        }).features;
        const f = feats && feats[0];
        if (!f || f.properties.cluster_id === undefined) return;
        const clusterId = f.properties.cluster_id;
        const src = map.getSource("locations") as maplibregl.GeoJSONSource | undefined;
        if (!src) return;
        // getClusterExpansionZoom calls back with the zoom level that
        // expands the clicked cluster into its constituent points.
        (src.getClusterExpansionZoom as (id: number, cb: (err: unknown, z?: number) => void) => void)(
          clusterId,
          (err, zoom) => {
            if (err || typeof zoom !== "number") return;
            map.easeTo({
              center: f.geometry.coordinates,
              zoom: Math.min(zoom + 0.5, 19),
              duration: 500,
            });
          },
        );
      });
      map.on("mouseenter", "clusters-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      // ── Security post icons (shield markers at gate locations) ──
      map.addSource("security-posts", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "security-shield",
        type: "symbol",
        source: "security-posts",
        layout: {
          "icon-image": "", // no sprite, use circle below
          "text-field": "\uD83D\uDEE1\uFE0F", // 🛡️
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10, 17, 16],
          "text-anchor": "bottom",
          "text-offset": [0, 0.2],
          "text-font": ["sans"],
          "text-allow-overlap": true,
        },
        paint: {
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
      // Shield background circle
      map.addLayer({
        id: "security-shield-bg",
        type: "circle",
        source: "security-posts",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 4, 17, 8],
          "circle-color": "#dc2626",
          "circle-opacity": 0.2,
          "circle-stroke-color": "#dc2626",
          "circle-stroke-width": 1.5,
          "circle-stroke-opacity": 0.6,
        },
      }, "security-shield"); // insert before the symbol so symbol renders on top

      // ── Live Activity sources (walkers + heatmap) ──
      map.addSource("activity-walkers", { type: "geojson", data: emptyFC() });
      map.addSource("activity-heatmap", { type: "geojson", data: emptyFC() });
      // Heatmap circles (rendered under walkers)
      map.addLayer({
        id: "activity-heat-cell",
        type: "circle",
        source: "activity-heatmap",
        paint: {
          "circle-radius": 35, // roughly covers one grid cell
          "circle-color": [
            "step", ["get", "count"],
            "#22c55e", 1, // 0: green
            "#22c55e", 3, // 1-2: green
            "#eab308", 6, // 3-5: yellow
            "#ef4444", 100, // 6+: red
          ],
          "circle-opacity": [
            "step", ["get", "count"],
            0, 1, // 0: invisible
            0.15, 3, // 1-2: low opacity
            0.25, 6, // 3-5: medium
            0.35, 100, // 6+: high
          ],
          "circle-blur": 1,
        },
      });
      // Walker dots (teal circles)
      map.addLayer({
        id: "activity-walker-dot",
        type: "circle",
        source: "activity-walkers",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 3, 17, 5],
          "circle-color": "#14b8a6",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.2,
        },
      });
      // Walker heading arrow (symbol layer)
      map.addLayer({
        id: "activity-walker-arrow",
        type: "symbol",
        source: "activity-walkers",
        layout: {
          "text-field": "→",
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 8, 17, 12],
          "text-rotate": ["get", "heading"],
          "text-anchor": "center",
          "text-font": ["sans"],
          "text-allow-overlap": true,
          "text-rotation-alignment": "map",
        },
        paint: {
          "text-color": "#0d9488",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      });

      // ── SOS emergency indicator ──
      map.addSource("sos-pos", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "sos-pulse-ring",
        type: "circle",
        source: "sos-pos",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 20, 17, 35],
          "circle-color": "#dc2626",
          "circle-opacity": 0.3,
          "circle-stroke-color": "#dc2626",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "sos-dot",
        type: "circle",
        source: "sos-pos",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 6, 17, 10],
          "circle-color": "#dc2626",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });

      onMapReady?.(map);
    });

    mapRef.current = map;

    // ── Dark-mode observer: live-update the background-color paint when
    // the html element's `class` attribute toggles `dark` (next-themes).
    const observer = new MutationObserver(() => {
      try {
        map.setPaintProperty("background", "background-color", isDarkMode() ? BG_DARK : BG_LIGHT);
      } catch {
        // background may not exist yet
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [enrichedCampus]);

  // ── GPS pulse animation ── rAF loop pulsing the gps-pos-pulse layer's
  // opacity between 0 and ~0.4 with a sine wave. Only runs when livePos exists.
  useEffect(() => {
    if (!livePos) return;
    const map = mapRef.current;
    if (!map) return;
    let rafId = 0;
    const start = performance.now();
    const animate = () => {
      const t = (performance.now() - start) / 1000;
      const phase = (Math.sin(t * 2.2) + 1) / 2; // 0..1
      const opacity = 0.05 + 0.32 * phase;
      try {
        map.setPaintProperty("gps-pos-pulse", "circle-opacity", opacity);
        // also pulse the radius for a more visible "radar ping"
        const baseR = map.getZoom() >= 17 ? 28 : 14;
        const r = baseR * (1 + 0.35 * phase);
        map.setPaintProperty("gps-pos-pulse", "circle-radius", r);
      } catch {
        // layer not ready yet
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [livePos]);

  // update routes when they change (with subtle fade-in via transition).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routes) return;
    const obj = selectedObjective;
    const selected =
      obj === "FASTEST"
        ? routes.fastest
        : obj === "SHORTEST"
          ? routes.shortest
          : obj === "EASIEST"
            ? routes.easiest
            : routes.alternative;
    const others = [
      routes.fastest,
      routes.shortest,
      routes.easiest,
      routes.alternative,
    ].filter((r) => r && r !== selected);

    const src1 = map.getSource("route-selected") as maplibregl.GeoJSONSource | undefined;
    const src2 = map.getSource("route-others") as maplibregl.GeoJSONSource | undefined;
    if (src1 && selected) {
      src1.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: selected.path },
        properties: { color: ROUTE_COLORS[selected.objective] },
      });
    } else if (src1) {
      src1.setData(emptyFC());
    }
    if (src2) {
      src2.setData({
        type: "FeatureCollection",
        features: others.map((r) => ({
          type: "Feature",
          geometry: { type: "LineString", coordinates: r!.path },
          properties: { color: ROUTE_COLORS[r!.objective] },
        })),
      });
    }

    // Fade-in: instant set opacity to 0, then animate back to full via
    // the configured transition. The "0 → full" jump triggers the
    // configured line-opacity-transition (500ms) on the line layer.
    try {
      // disable transition so the reset to 0 is instantaneous
      map.setPaintProperty("route-selected-line", "line-opacity-transition", { duration: 0, delay: 0 });
      map.setPaintProperty("route-selected-casing", "line-opacity-transition", { duration: 0, delay: 0 });
      map.setPaintProperty("route-others-line", "line-opacity-transition", { duration: 0, delay: 0 });
      map.setPaintProperty("route-selected-line", "line-opacity", 0);
      map.setPaintProperty("route-selected-casing", "line-opacity", 0);
      map.setPaintProperty("route-others-line", "line-opacity", 0);
      // re-enable transition + animate back to full opacity
      requestAnimationFrame(() => {
        try {
          map.setPaintProperty("route-selected-line", "line-opacity-transition", { duration: 500, delay: 0 });
          map.setPaintProperty("route-selected-casing", "line-opacity-transition", { duration: 500, delay: 0 });
          map.setPaintProperty("route-others-line", "line-opacity-transition", { duration: 500, delay: 0 });
          map.setPaintProperty("route-selected-line", "line-opacity", 1);
          map.setPaintProperty("route-selected-casing", "line-opacity", 1);
          map.setPaintProperty("route-others-line", "line-opacity", 0.35);
        } catch {
          // map may have been removed
        }
      });
    } catch {
      // layers not ready yet
    }
  }, [routes, selectedObjective]);

  // update GPS position + trail
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("gps-pos") as maplibregl.GeoJSONSource | undefined;
    const trail = map.getSource("gps-trail") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      if (livePos) {
        src.setData({
          type: "Feature",
          geometry: { type: "Point", coordinates: [livePos.lng, livePos.lat] },
          properties: {},
        });
      } else {
        src.setData(emptyFC());
      }
    }
    if (trail) {
      trail.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: travelledPath },
        properties: {},
      });
    }
  }, [livePos, travelledPath]);

  // update replay trace (a past journey's GPS path being shown on the map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const trace = map.getSource("replay-trace") as maplibregl.GeoJSONSource | undefined;
    const ends = map.getSource("replay-endpoints") as maplibregl.GeoJSONSource | undefined;
    if (trace) {
      trace.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: replayTrace ?? [] },
        properties: {},
      });
    }
    if (ends) {
      if (replayTrace && replayTrace.length >= 2) {
        ends.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: replayTrace[0] },
              properties: { role: "start" },
            },
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: replayTrace[replayTrace.length - 1] },
              properties: { role: "end" },
            },
          ],
        });
      } else {
        ends.setData(emptyFC());
      }
    }
  }, [replayTrace]);

  // update active step segment on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("active-step") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      if (activeStepSegment && activeStepSegment.length >= 2) {
        src.setData({
          type: "Feature",
          geometry: { type: "LineString", coordinates: activeStepSegment },
          properties: {},
        });
      } else {
        src.setData(emptyFC());
      }
    }
  }, [activeStepSegment]);

  // ── Live Activity: fetch campus activity data every 30 seconds when enabled ──
  useEffect(() => {
    if (!showActivity) {
      setActivityData(null);
      // Remove activity layers from map
      const map = mapRef.current;
      if (map) {
        try {
          const walkersSrc = map.getSource("activity-walkers") as maplibregl.GeoJSONSource | undefined;
          const heatSrc = map.getSource("activity-heatmap") as maplibregl.GeoJSONSource | undefined;
          if (walkersSrc) walkersSrc.setData(emptyFC());
          if (heatSrc) heatSrc.setData(emptyFC());
        } catch { /* ignore */ }
      }
      return;
    }
    let cancelled = false;
    const fetchActivity = async () => {
      if (cancelled) return;
      setActivityLoading(true);
      try {
        const data = await api.campusActivity();
        if (!cancelled) setActivityData(data);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };
    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [showActivity]);

  // ── Render activity walkers + heatmap on the map ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Walker dots
    const walkersSrc = map.getSource("activity-walkers") as maplibregl.GeoJSONSource | undefined;
    if (walkersSrc) {
      if (activityData && showActivity) {
        walkersSrc.setData({
          type: "FeatureCollection",
          features: activityData.walkers.map((w: ActiveWalker) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [w.lng, w.lat] as [number, number] },
            properties: { heading: w.heading - 90, mode: w.mode, speed: w.speedMps },
          })),
        });
      } else {
        walkersSrc.setData(emptyFC());
      }
    }

    // Heatmap circles
    const heatSrc = map.getSource("activity-heatmap") as maplibregl.GeoJSONSource | undefined;
    if (heatSrc) {
      if (activityData && showActivity) {
        heatSrc.setData({
          type: "FeatureCollection",
          features: activityData.heatmap
            .filter((c: HeatCell) => c.count > 0)
            .map((c: HeatCell) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [c.centerLng, c.centerLat] as [number, number] },
              properties: { count: c.count, avgSpeed: c.avgSpeed },
            })),
        });
      } else {
        heatSrc.setData(emptyFC());
      }
    }
  }, [activityData, showActivity]);

  // ── Security posts on the map ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !campus) return;
    const secSrc = map.getSource("security-posts") as maplibregl.GeoJSONSource | undefined;
    if (!secSrc) return;
    // Filter location features that are gates (security posts)
    const gateFeatures = campus.locations.features.filter(
      (f) => (f.properties as { category?: string }).category === "GATE",
    );
    secSrc.setData({
      type: "FeatureCollection",
      features: gateFeatures,
    });
  }, [campus]);

  // ── SOS emergency indicator on the map ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sosSrc = map.getSource("sos-pos") as maplibregl.GeoJSONSource | undefined;
    if (!sosSrc) return;
    if (sosActive && livePos) {
      sosSrc.setData({
        type: "Feature",
        geometry: { type: "Point", coordinates: [livePos.lng, livePos.lat] },
        properties: {},
      });
    } else {
      sosSrc.setData(emptyFC());
    }
  }, [sosActive, livePos]);

  // SOS pulse animation
  useEffect(() => {
    if (!sosActive || !livePos) return;
    const map = mapRef.current;
    if (!map) return;
    let rafId = 0;
    const start = performance.now();
    const animate = () => {
      const t = (performance.now() - start) / 1000;
      const phase = (Math.sin(t * 3) + 1) / 2;
      try {
        map.setPaintProperty("sos-pulse-ring", "circle-opacity", 0.1 + 0.4 * phase);
        const baseR = map.getZoom() >= 17 ? 35 : 20;
        map.setPaintProperty("sos-pulse-ring", "circle-radius", baseR * (1 + 0.3 * phase));
      } catch { /* ignore */ }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [sosActive, livePos]);

  // Compute approximate scale for current zoom
  const scaleMeters = Math.round(
    (156543.03392 * Math.cos((23 * Math.PI) / 180)) / Math.pow(2, mapZoom) * 50,
  );
  const scaleLabel = scaleMeters >= 1000 ? `${(scaleMeters / 1000).toFixed(0)} km` : `${scaleMeters} m`;

  return (
    <div className="absolute inset-0 h-full w-full">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* Subtle dot-grid texture overlay (above canvas, pointer-events-none) */}
      <div
        aria-hidden
        className="campus-texture pointer-events-none absolute inset-0 z-[1] opacity-25 dark:opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(13,148,136,0.18) 1px, transparent 1.4px)",
          backgroundSize: "26px 26px",
          mixBlendMode: "multiply",
        }}
      />

      {/* Compass indicator — top-right, more prominent */}
      <div
        className="absolute top-3 right-3 z-10 flex items-center justify-center
          rounded-xl bg-background/90 backdrop-blur shadow-premium-2
          w-11 h-11 cursor-pointer transition-transform hover:scale-110 border border-border/50"
        title="Reset north"
        onClick={() => {
          const map = mapRef.current;
          if (map) map.rotateTo(0, { duration: 300 });
        }}
      >
        <Compass
          size={22}
          className="text-foreground transition-transform duration-300"
          style={{ transform: `rotate(${-bearing}deg)` }}
        />
      </div>

      {/* Layer toggle panel — left side */}
      <div className="absolute top-3 left-3 z-10">
        <button
          type="button"
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="flex items-center justify-center w-9 h-9 rounded-xl
            bg-background/90 backdrop-blur shadow-premium-2 border border-border/50
            text-muted-foreground hover:text-foreground hover:bg-background
            active:scale-95 transition-all cursor-pointer"
          aria-label="Toggle layer panel"
        >
          <Layers size={18} />
        </button>
        {showLayerPanel && (
          <div className="glass mt-1.5 w-36 rounded-xl p-2 animate-fade-in">
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Map Layers
            </p>
            {LAYER_GROUPS.map((group) => (
              <button
                key={group.id}
                onClick={() => toggleLayer(group.id)}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-accent"
              >
                {layerVisibility[group.id] ? (
                  <Eye className="h-3 w-3 text-teal-600" />
                ) : (
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={cn(!layerVisibility[group.id] && "text-muted-foreground line-through")}>
                  {group.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live Activity toggle — below layer panel */}
      <div className="absolute top-14 left-3 z-10">
        <button
          type="button"
          onClick={() => setShowActivity(!showActivity)}
          className={cn(
            "flex items-center justify-center gap-1.5 h-9 rounded-xl backdrop-blur shadow-premium-2 border transition-all cursor-pointer active:scale-95",
            showActivity
              ? "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-300 px-2.5"
              : "bg-background/90 text-muted-foreground hover:text-foreground hover:bg-background border-border/50 w-9",
          )}
          aria-label="Toggle live campus activity"
        >
          <Activity size={16} className={cn(showActivity && "animate-pulse")} />
          {showActivity && (
            <span className="text-[11px] font-medium">
              {activityLoading ? "…" : activityData ? `${activityData.totalWalkers} active` : "Live"}
            </span>
          )}
        </button>
        {showActivity && activityData && !activityLoading && (
          <div className="glass mt-1.5 w-40 rounded-xl p-2 animate-fade-in">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Campus Activity
            </p>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="font-medium">{activityData.totalWalkers} walkers active</span>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground capitalize">
              {activityData.timeContext.replace("_", " ")} pattern
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[9px] text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500 opacity-60" /> Low
              <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500 opacity-70" /> Med
              <span className="inline-flex h-2 w-2 rounded-full bg-red-500 opacity-80" /> High
            </div>
          </div>
        )}
      </div>

      {/* Zoom + 3D controls — bottom-right */}
      <div className="absolute bottom-12 right-3 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex items-center justify-center w-9 h-9 rounded-xl
            bg-background/90 backdrop-blur shadow-sm
            text-muted-foreground hover:text-foreground hover:bg-background
            active:scale-95 transition-all cursor-pointer"
          aria-label="Zoom in"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex items-center justify-center w-9 h-9 rounded-xl
            bg-background/90 backdrop-blur shadow-sm
            text-muted-foreground hover:text-foreground hover:bg-background
            active:scale-95 transition-all cursor-pointer"
          aria-label="Zoom out"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={handleToggle3D}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl backdrop-blur shadow-sm transition-all cursor-pointer active:scale-95",
            pitch > 0
              ? "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-300"
              : "bg-background/90 text-muted-foreground hover:text-foreground hover:bg-background border border-border/50",
          )}
          aria-label="Toggle 3D tilt"
        >
          <Box size={18} />
        </button>
      </div>

      {/* Scale + zoom indicator — bottom-left */}
      <div className="absolute bottom-3 left-3 z-10 flex items-end gap-3 text-[10px] text-muted-foreground">
        <div className="flex flex-col items-start">
          <div className="h-px w-12 bg-muted-foreground/50" />
          <div className="mt-0.5 flex w-12 justify-between">
            <span>0</span>
            <span>{scaleLabel}</span>
          </div>
        </div>
        {/* Current zoom level badge */}
        <div
          className="rounded-md border border-border/40 bg-background/80 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-muted-foreground backdrop-blur"
          title="Current map zoom level"
        >
          Z{mapZoom.toFixed(1)}
        </div>
      </div>
    </div>
  );
});

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
