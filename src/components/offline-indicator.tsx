"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi, CheckCircle2 } from "lucide-react";

/**
 * Offline indicator — listens to browser online/offline events.
 *
 * - When offline, shows a banner at the top of the page (below header) in amber.
 * - When transitioning offline→online, fires a "Reconnected" toast in green.
 * - When transitioning online→offline, fires a "You're offline" toast in amber.
 * - Online state has no banner (silent) to keep the UI clean.
 *
 * Uses `useSyncExternalStore` (the React 18+ recommended API for
 * subscribing to external stores) so it works correctly under SSR hydration
 * without triggering cascading renders.
 */

/** Subscribe to browser online/offline events; returns an unsubscribe fn. */
function subscribe(callback: () => void): () => void {
  const onOnline = () => callback();
  const onOffline = () => callback();
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

/** Client snapshot: read current online status from navigator. */
function getSnapshot(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/** Server snapshot: assume online during SSR (no banner rendered). */
function getServerSnapshot(): boolean {
  return true;
}

export function OfflineIndicator() {
  // `useSyncExternalStore` correctly handles SSR + external browser events
  // without triggering cascading renders or hydration warnings.
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Track previous online state so we can fire toasts on transitions.
  // Initialized to the first-render value, so the very first effect run
  // sees no change and skips firing any toast.
  const prevOnlineRef = useRef(online);

  useEffect(() => {
    const was = prevOnlineRef.current;
    // No change → no toast (this branch handles the first-render no-op case).
    if (was === online) return;

    if (was && !online) {
      // went online → offline
      toast.warning("You're offline", {
        description: "Showing cached campus data.",
        icon: <WifiOff className="h-4 w-4" />,
        duration: 4000,
      });
    } else if (!was && online) {
      // went offline → online
      toast.success("Reconnected", {
        description: "Back online — live campus data restored.",
        icon: <CheckCircle2 className="h-4 w-4" />,
        duration: 3500,
      });
    }

    // Update the ref directly (no setState — ref mutation is safe here
    // because we're synchronizing with the external store's latest value).
    prevOnlineRef.current = online;
  }, [online]);

  // Online state: no banner (silent)
  if (online) return null;

  // Offline state: amber banner with slide-down animation
  return (
    <div
      role="status"
      aria-live="polite"
      className="banner-slide-down sticky top-14 z-20 flex items-center justify-center gap-2 border-b border-amber-300/40 bg-amber-100/95 px-3 py-1.5 text-center text-[11px] font-medium text-amber-900 backdrop-blur supports-[backdrop-filter]:bg-amber-100/80 dark:border-amber-700/40 dark:bg-amber-950/90 dark:text-amber-200"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Offline mode — showing cached campus data</span>
      <Wifi className="h-3 w-3 shrink-0 opacity-30 line-through" aria-hidden />
    </div>
  );
}
