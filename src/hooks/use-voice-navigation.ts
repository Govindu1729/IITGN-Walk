"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "iitgn-voice-nav";

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface VoiceNavigationApi {
  /** Whether voice announcements are currently enabled (persisted). */
  enabled: boolean;
  /** Whether the browser exposes the Web Speech API. */
  supported: boolean;
  /** Toggle voice on/off and persist the choice to localStorage. */
  toggle: () => void;
  /** Speak text via window.speechSynthesis. Cancels any in-flight speech. */
  speak: (text: string, opts?: SpeakOptions) => void;
  /** Cancel any pending speech. */
  cancel: () => void;
}

function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

/**
 * Pick the best English voice for navigation announcements.
 * Preference order: en-US Google → en-US → en-GB → any en-*.
 * Falls back to undefined when no English voice is available.
 */
function pickEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  return (
    voices.find((v) => v.lang === "en-US" && v.name.includes("Google")) ??
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang === "en-GB") ??
    voices.find((v) => v.lang.startsWith("en"))
  );
}

/**
 * Client-side voice navigation hook backed by the Web Speech API
 * (`window.speechSynthesis`). Persists the on/off toggle to localStorage so
 * the user's preference survives page reloads.
 *
 * Real-time turn-by-turn announcements are emitted by the consuming
 * component (e.g. NavigationPanel) — typically in a useEffect that watches
 * the active step index — by calling `speak()` with the current step's
 * natural-language instruction.
 *
 * This hook is deliberately client-only: it does NOT call the server-side
 * /api/tts endpoint, because real-time navigation needs sub-100ms latency
 * which the browser's built-in SpeechSynthesis delivers for free.
 */
export function useVoiceNavigation(): VoiceNavigationApi {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | undefined>(
    undefined,
  );

  // Initialise `supported`, hydrate `enabled` from localStorage, and load
  // the preferred voice. All deferred to after mount to avoid SSR mismatch.
  useEffect(() => {
    const ok = speechSupported();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
    if (!ok) return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setEnabled(true);
    } catch {
      // localStorage may be unavailable (private mode / disabled) — ignore.
    }

    const loadVoices = () => {
      setVoice(pickEnglishVoice(window.speechSynthesis.getVoices()));
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // Cancel any pending speech when the hook unmounts (e.g. user navigates
  // away from the navigation panel mid-announcement).
  useEffect(() => {
    return () => {
      if (!speechSupported()) return;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore — best-effort cleanup.
      }
    };
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore persistence failure.
      }
      // Cancel any in-flight speech on toggle (covers both on→off and
      // off→on so we start from a clean slate).
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore.
      }
      return next;
    });
  }, []);

  const speak = useCallback(
    (text: string, opts?: SpeakOptions) => {
      if (!speechSupported() || !text) return;
      try {
        // Cancel any in-flight speech first so announcements don't queue up.
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = opts?.rate ?? 0.95;
        utterance.pitch = opts?.pitch ?? 1.0;
        utterance.volume = opts?.volume ?? 0.8;
        const chosenVoice =
          voice ?? pickEnglishVoice(window.speechSynthesis.getVoices());
        if (chosenVoice) utterance.voice = chosenVoice;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Ignore TTS errors (unsupported utterance, etc.)
      }
    },
    [voice],
  );

  const cancel = useCallback(() => {
    if (!speechSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore.
    }
  }, []);

  return { enabled, supported, toggle, speak, cancel };
}
