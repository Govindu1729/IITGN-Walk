"use client";

// URL deep-link synchronisation hook for the IITGN Walk route planner.
//
// Responsibilities:
//   1. `updateUrl(state)` — serialise planner state into the URL query string
//      using `buildShareUrl` and replace (NOT push) the current history entry
//      so the URL bar reflects what the user is currently looking at without
//      polluting the back-button stack.
//   2. `shareUrl` — the full URL (origin + pathname + query) suitable for
//      copying to the clipboard. Reads from the live browser URL via
//      `useSyncExternalStore` so it stays in sync after `replaceState` calls
//      without triggering the `react-hooks/set-state-in-effect` lint rule.
//      Returns `null` during SSR / before first client mount.
//   3. `copyShareUrl()` — writes `shareUrl` to the system clipboard via
//      `navigator.clipboard.writeText()` and resolves when done. Rejects on
//      failure so the caller can show an error toast.

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { buildShareUrl, type ShareState } from "@/lib/routing/share-url";

export interface UseUrlSyncResult {
  /** Full URL (origin + pathname + query) reflecting the latest share state,
   *  or `null` on the server / before first mount. */
  shareUrl: string | null;
  /** Replace the current history entry with a URL reflecting `state`.
   *  Debounced via `requestAnimationFrame` to coalesce rapid updates. */
  updateUrl: (state: ShareState) => void;
  /** Copy the current `shareUrl` to the system clipboard. */
  copyShareUrl: () => Promise<void>;
}

/**
 * Custom event dispatched after every `history.replaceState` so the
 * `useSyncExternalStore` subscription notices the URL changed (replaceState
 * itself fires no native event).
 */
const URL_CHANGE_EVENT = "iitgnwalk:url-change";

function subscribeUrl(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // `popstate` covers browser back/forward; our custom event covers
  // programmatic `replaceState` from `updateUrl`.
  window.addEventListener("popstate", callback);
  window.addEventListener(URL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(URL_CHANGE_EVENT, callback);
  };
}

function getUrlSnapshot(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function getServerUrlSnapshot(): string {
  return "";
}

/**
 * Keep the browser URL bar in sync with the route-planner state and expose
 * a clipboard-copy helper for sharing routes via deep link.
 *
 * `shareUrl` is sourced from `useSyncExternalStore`, which:
 *   - returns `""` (the server snapshot) during SSR and during the very first
 *     client hydration render, then
 *   - re-renders with `window.location.href` (the client snapshot) once
 *     hydration completes — all without any `setState`-in-effect, so the
 *     `react-hooks/set-state-in-effect` lint rule stays satisfied.
 *
 * We normalise `""` → `null` in the returned object so callers can use a
 * simple truthiness check.
 */
export function useUrlSync(): UseUrlSyncResult {
  const liveUrl = useSyncExternalStore(
    subscribeUrl,
    getUrlSnapshot,
    getServerUrlSnapshot,
  );
  const shareUrl: string | null = liveUrl || null;

  // Pending state that hasn't been flushed to the URL yet. We debounce via
  // `requestAnimationFrame` so a burst of store updates (e.g. setting from +
  // mode + via in quick succession) only causes a single `replaceState` call.
  const pendingRef = useRef<ShareState | null>(null);
  const rafRef = useRef<number | null>(null);

  // Flush the pending state to the URL bar via `history.replaceState`.
  const flush = useCallback(() => {
    rafRef.current = null;
    const state = pendingRef.current;
    if (state === null) return;
    pendingRef.current = null;
    if (typeof window === "undefined") return;
    const qs = buildShareUrl(state);
    const url = `${window.location.pathname}${qs}`;
    try {
      // `replaceState` (not `pushState`) so we don't pollute the back stack.
      window.history.replaceState({}, "", url || "/");
    } catch {
      // Some sandboxed environments throw on history mutations — fail silently
      // rather than crash the planner.
    }
    // replaceState fires no native event, so dispatch our own so the
    // `useSyncExternalStore` subscription re-reads `window.location.href`.
    try {
      window.dispatchEvent(new Event(URL_CHANGE_EVENT));
    } catch {
      // `Event` may be unavailable in some test environments — not critical.
    }
  }, []);

  const updateUrl = useCallback(
    (state: ShareState) => {
      pendingRef.current = state;
      if (rafRef.current !== null) return; // already scheduled
      if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") {
        // SSR or non-browser env: flush synchronously (no-op for replaceState).
        flush();
        return;
      }
      rafRef.current = requestAnimationFrame(() => flush());
    },
    [flush],
  );

  // Cancel any pending RAF on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const copyShareUrl = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined") return;
    // If a pending update hasn't flushed yet, flush it first so the copied
    // link reflects the very latest state.
    if (pendingRef.current !== null) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      flush();
    }
    const url = shareUrl ?? window.location.href;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
    // Legacy fallback for browsers without the async clipboard API.
    // We deliberately keep this minimal — the modern path is preferred.
    throw new Error("Clipboard API unavailable");
  }, [flush, shareUrl]);

  return { shareUrl, updateUrl, copyShareUrl };
}
