"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, RotateCcw, Loader2 } from "lucide-react";
import type { DirectionStep } from "@/lib/routing/types";
import { cn } from "@/lib/utils";

interface VoiceNavigatorProps {
  /** The route's turn-by-turn steps */
  steps: DirectionStep[];
  /** Index of the currently active step (from progress) */
  activeStepIndex: number;
  /** Remaining distance in meters (used for "in X meters" prefix) */
  remainingM: number;
  /** Whether the journey is currently active */
  journeyActive: boolean;
}

/**
 * Generates a natural voice instruction from a DirectionStep.
 * Examples: "In 50 meters, turn left at Plaza West"
 *           "Head northeast on the internal walkway"
 */
function formatVoiceInstruction(
  step: DirectionStep,
  distanceToStepM: number,
): string {
  const maneuverText: Record<string, string> = {
    DEPART: "Head",
    CONTINUE: "Continue",
    TURN_LEFT: "Turn left",
    TURN_RIGHT: "Turn right",
    SHARP_LEFT: "Turn sharp left",
    SHARP_RIGHT: "Turn sharp right",
    SLIGHT_LEFT: "Turn slightly left",
    SLIGHT_RIGHT: "Turn slightly right",
    STAIRS: "Take the stairs",
    ARRIVE: "You have arrived",
  };

  const directionText: Record<string, string> = {
    N: "north",
    NE: "northeast",
    E: "east",
    SE: "southeast",
    S: "south",
    SW: "southwest",
    W: "west",
    NW: "northwest",
  };

  const maneuver = maneuverText[step.maneuver] ?? step.instruction;
  const direction = directionText[step.direction] ?? "";
  const landmark = step.endLabel ?? "";

  // Build instruction
  let instruction = "";

  if (step.maneuver === "ARRIVE") {
    instruction = landmark
      ? `You have arrived at ${landmark}`
      : "You have arrived at your destination";
  } else if (step.maneuver === "DEPART") {
    instruction = direction
      ? `${maneuver} ${direction}${landmark ? ` on ${landmark}` : ""}`
      : step.instruction;
  } else {
    // For turn maneuvers, add distance prefix
    const distPrefix =
      distanceToStepM > 0 && distanceToStepM < 200
        ? `In ${Math.round(distanceToStepM)} meters, `
        : "";
    instruction = landmark
      ? `${distPrefix}${maneuver} at ${landmark}`
      : `${distPrefix}${maneuver}${direction ? ` ${direction}` : ""}`;
  }

  return instruction || step.instruction;
}

export function VoiceNavigator({
  steps,
  activeStepIndex,
  remainingM: _remainingM,
  journeyActive,
}: VoiceNavigatorProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLastInstruction, setHasLastInstruction] = useState(false);
  const lastSpokenStepRef = useRef<number>(-1);
  const lastInstructionRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      // Stop browser speech synthesis if active
      if (typeof speechSynthesis !== "undefined") {
        speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Play audio via Web Audio API from an ArrayBuffer
   */
  const playAudioBuffer = useCallback(async (arrayBuffer: ArrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      // Resume if suspended (browser autoplay policy)
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      return new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start(0);
      });
    } catch {
      // Fallback: just wait a bit
      await new Promise((r) => setTimeout(r, 1500));
    }
  }, []);

  /**
   * Speak text using TTS API (primary) or browser SpeechSynthesis (fallback).
   * This function calls setState but is designed to be called from event handlers
   * or deferred callbacks, not synchronously in effects.
   */
  const speak = useCallback(
    async (text: string) => {
      if (!text || muted) return;

      setSpeaking(true);
      lastInstructionRef.current = text;
      setHasLastInstruction(true);

      // Try TTS API first
      try {
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });

        setLoading(false);

        if (res.ok && res.headers.get("Content-Type")?.includes("audio")) {
          const arrayBuffer = await res.arrayBuffer();
          if (!controller.signal.aborted) {
            await playAudioBuffer(arrayBuffer);
          }
          setSpeaking(false);
          return;
        }
      } catch (err) {
        // If aborted or network error, fall through to browser TTS
        setLoading(false);
        if ((err as Error).name === "AbortError") {
          setSpeaking(false);
          return;
        }
      }

      // Fallback to browser SpeechSynthesis API
      try {
        if (typeof speechSynthesis === "undefined") {
          setSpeaking(false);
          return;
        }
        speechSynthesis.cancel(); // cancel any ongoing speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        // Try to pick an English voice
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(
          (v) => v.lang.startsWith("en") && v.name.includes("Google"),
        ) ?? voices.find((v) => v.lang.startsWith("en"));
        if (englishVoice) utterance.voice = englishVoice;

        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        speechSynthesis.speak(utterance);
      } catch {
        setSpeaking(false);
      }
    },
    [muted, playAudioBuffer],
  );

  // Auto-speak when active step changes.
  // We use a ref to track pending speech instructions and defer via setTimeout
  // to avoid calling setState synchronously within the effect body.
  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

  useEffect(() => {
    if (
      !voiceEnabled ||
      !journeyActive ||
      !steps.length ||
      activeStepIndex < 0 ||
      activeStepIndex >= steps.length
    )
      return;

    // Only speak if this is a new step
    if (activeStepIndex === lastSpokenStepRef.current) return;
    lastSpokenStepRef.current = activeStepIndex;

    const step = steps[activeStepIndex];
    const distToStep =
      activeStepIndex > 0
        ? Math.max(0, step.cumulativeM - steps[activeStepIndex - 1].cumulativeM)
        : step.cumulativeM;

    const instruction = formatVoiceInstruction(step, distToStep);
    // Defer to avoid synchronous setState in effect
    const timer = setTimeout(() => speakRef.current(instruction), 0);
    return () => clearTimeout(timer);
  }, [voiceEnabled, journeyActive, activeStepIndex, steps]);

  // Speak the first step when voice is first enabled during a journey
  useEffect(() => {
    if (voiceEnabled && journeyActive && steps.length > 0 && lastSpokenStepRef.current === -1) {
      const firstStep = steps[0];
      const instruction = formatVoiceInstruction(firstStep, firstStep.cumulativeM);
      lastSpokenStepRef.current = 0;
      // Defer to avoid synchronous setState in effect
      const timer = setTimeout(() => speakRef.current(instruction), 0);
      return () => clearTimeout(timer);
    }
  }, [voiceEnabled, journeyActive, steps]);

  const handleRepeat = useCallback(() => {
    if (lastInstructionRef.current) {
      speak(lastInstructionRef.current);
    }
  }, [speak]);

  const handleToggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      if (prev) {
        // Turning off — cancel any ongoing speech
        abortRef.current?.abort();
        if (typeof speechSynthesis !== "undefined") {
          speechSynthesis.cancel();
        }
        setSpeaking(false);
        lastSpokenStepRef.current = -1;
      }
      return !prev;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      if (!prev) {
        // Muting — cancel current speech
        abortRef.current?.abort();
        if (typeof speechSynthesis !== "undefined") {
          speechSynthesis.cancel();
        }
        setSpeaking(false);
      }
      return !prev;
    });
  }, []);

  if (!journeyActive || steps.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* Voice toggle */}
      <Button
        variant={voiceEnabled ? "default" : "outline"}
        size="sm"
        className={cn(
          "h-8 gap-1.5 text-xs",
          voiceEnabled &&
            "bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800",
        )}
        onClick={handleToggleVoice}
        aria-label={voiceEnabled ? "Disable voice navigation" : "Enable voice navigation"}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : speaking ? (
          <Volume2 className="h-3.5 w-3.5 animate-pulse" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">
          {voiceEnabled ? (speaking ? "Speaking…" : "Voice On") : "Voice"}
        </span>
      </Button>

      {voiceEnabled && (
        <>
          {/* Mute toggle */}
          <Button
            variant={muted ? "destructive" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={handleToggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute voice" : "Mute voice"}
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Repeat last instruction */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleRepeat}
            disabled={!hasLastInstruction || muted}
            aria-label="Repeat last instruction"
            title="Repeat last voice instruction"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
