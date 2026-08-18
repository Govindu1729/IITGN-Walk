"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Animates a number from 0 → `target` over `duration` ms using an
 * ease-out cubic curve and requestAnimationFrame.
 *
 * @param target   The final number to count up to.
 * @param duration Animation length in ms (default 1200).
 * @param enabled  If false (or target is 0), returns `String(target)` immediately.
 * @returns The current interpolated value as a string (no decimals for integers,
 *          1 decimal place for non-integers).
 */
export function useCountUp(
  target: number,
  duration: number = 1200,
  enabled: boolean = true,
): string {
  // When animation is disabled or target is zero, skip state entirely
  const skip = !enabled || target === 0;

  const [display, setDisplay] = useState<string>(skip ? String(target) : "0");
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (skip) return;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress1 = Math.min(elapsed / duration, 1);
      // Ease-out cubic: fast start, slow finish
      const progress = 1 - Math.pow(1 - progress1, 3);
      const current = target * progress;

      // Format: integer targets show no decimals; non-integer get 1 decimal
      if (Number.isInteger(target)) {
        setDisplay(String(Math.round(current)));
      } else {
        setDisplay(current.toFixed(1));
      }

      if (progress1 < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Ensure we land exactly on the target
        setDisplay(String(target));
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, skip]);

  return skip ? String(target) : display;
}
