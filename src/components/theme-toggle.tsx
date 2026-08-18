"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// Client-only "is mounted" via useSyncExternalStore — avoids both hydration
// mismatch and the set-state-in-effect lint rule.
const emptySubscribe = () => () => {};
const getMountedClient = () => true;
const getMountedServer = () => false;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getMountedClient,
    getMountedServer,
  );

  // stable placeholder until mounted (SSR-safe)
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Toggle theme">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
