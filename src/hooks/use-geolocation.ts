"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export interface GeoPos {
  lat: number;
  lng: number;
  accuracyM?: number;
  heading?: number | null;
  speed?: number | null;
  ts: number; // epoch ms (device)
}

export interface GeoState {
  supported: boolean;
  permission: "granted" | "denied" | "prompt" | "unknown";
  pos: GeoPos | null;
  error: string | null;
  watching: boolean;
}

// Client-only "is geolocation supported" via useSyncExternalStore — the React
// recommended pattern for reading client-only values without hydration mismatch.
const emptySubscribe = () => () => {};
const getGeoSupportedClient = () =>
  typeof navigator !== "undefined" && "geolocation" in navigator;
const getGeoSupportedServer = () => false;

/**
 * useGeolocation — wraps navigator.geolocation.watchPosition with a clean
 * state surface. Tolerates permission denial / unsupported devices.
 */
export function useGeolocation() {
  const supported = useSyncExternalStore(
    emptySubscribe,
    getGeoSupportedClient,
    getGeoSupportedServer,
  );
  const [state, setState] = useState<Omit<GeoState, "supported">>({
    permission: "unknown",
    pos: null,
    error: null,
    watching: false,
  });
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setState((s) => ({ ...s, watching: false }));
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        supported: false,
        error: "Geolocation not supported on this device",
      }));
      return;
    }
    if (watchId.current !== null) return;
    setState((s) => ({ ...s, watching: true, error: null }));
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setState((s) => ({
          ...s,
          permission: "granted",
          pos: {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracyM: p.coords.accuracy,
            heading: p.coords.heading,
            speed: p.coords.speed,
            ts: p.timestamp,
          },
          error: null,
        }));
      },
      (err) => {
        setState((s) => ({
          ...s,
          permission: err.code === 1 ? "denied" : s.permission,
          error:
            err.code === 1
              ? "Location permission denied"
              : err.code === 2
                ? "Position unavailable (check GPS/wifi)"
                : err.code === 3
                  ? "Location request timed out"
                  : err.message,
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      },
    );
  }, []);

  // one-shot "use my current location"
  const getCurrent = useCallback((): Promise<GeoPos | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) =>
          resolve({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracyM: p.coords.accuracy,
            heading: p.coords.heading,
            speed: p.coords.speed,
            ts: p.timestamp,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 },
      );
    });
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { ...state, supported, start, stop, getCurrent };
}
