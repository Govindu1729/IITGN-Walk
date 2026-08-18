"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Siren,
  Shield,
  Phone,
  MapPin,
  Clock,
  Lamp,
  Moon,
  Building2,
  Route,
} from "lucide-react";
import type { CampusLocation } from "@/lib/api-client";
import { haversine } from "@/lib/geo/geo";
import { cn } from "@/lib/utils";

// ── Security posts (gates) with contact info ──

const SECURITY_POSTS = [
  { slug: "main-gate", name: "Main Gate Security", contact: "+91-79-XXXX-1001" },
  { slug: "north-gate", name: "North Gate Security", contact: "+91-79-XXXX-1002" },
  { slug: "east-gate", name: "East Gate Security", contact: "+91-79-XXXX-1003" },
];

const EMERGENCY_CONTACT = "Campus Security: +91-79-XXXX-1000";

interface Props {
  locations: CampusLocation[];
  /** Current user position (or selected "from" position) */
  userPos?: { lat: number; lng: number } | null;
  /** Whether well-lit paths preference is active */
  wellLitPaths?: boolean;
  /** Toggle callback for well-lit paths */
  onWellLitPathsChange?: (val: boolean) => void;
  /** Callback when SOS is triggered */
  onSosTrigger?: () => void;
}

export function SafetyPanel({
  locations,
  userPos,
  wellLitPaths = false,
  onWellLitPathsChange,
  onSosTrigger,
}: Props) {
  const [sosConfirmed, setSosConfirmed] = useState(false);

  // Find nearest security post (derived from props, no setState)
  const { nearestPost, nearestDist } = useMemo(() => {
    const securityLocations = locations.filter((l) => l.category === "GATE");
    if (!userPos || securityLocations.length === 0) {
      return { nearestPost: null as (typeof SECURITY_POSTS)[0] | null, nearestDist: null as number | null };
    }

    let minDist = Infinity;
    let nearest: CampusLocation | null = null;
    for (const loc of securityLocations) {
      const d = haversine(userPos, { lat: loc.lat, lng: loc.lng });
      if (d < minDist) {
        minDist = d;
        nearest = loc;
      }
    }

    if (nearest) {
      const post = SECURITY_POSTS.find((p) => p.slug === nearest!.slug) ?? SECURITY_POSTS[0];
      return { nearestPost: post, nearestDist: minDist };
    }
    return { nearestPost: null as (typeof SECURITY_POSTS)[0] | null, nearestDist: null as number | null };
  }, [locations, userPos]);

  const handleSosConfirm = () => {
    setSosConfirmed(true);
    onSosTrigger?.();
  };

  // Night mode: after 8 PM
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  const walkTimeToSecurity = nearestDist ? Math.round(nearestDist / 1.2 / 60) : null; // ~1.2 m/s walking speed

  return (
    <div className="space-y-3">
      {/* SOS Button */}
      <Card className="border-l-4 border-l-red-500 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Siren className="h-4 w-4 text-red-600" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Emergency
          </h3>
        </div>

        {!sosConfirmed ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full gap-2 bg-red-600 text-white hover:bg-red-700 h-12 text-base font-bold shadow-lg shadow-red-600/20"
              >
                <Siren className="h-5 w-5 animate-pulse" />
                SOS — Emergency Alert
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Siren className="h-5 w-5 text-red-600" />
                  Send Emergency Alert?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will alert campus security and show your position on the map. Only use in genuine emergencies.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSosConfirm}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Send Alert
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-red-600 animate-pulse" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                Emergency Alert Active
              </span>
            </div>
            {nearestPost && (
              <div className="space-y-1 text-xs text-red-800 dark:text-red-200">
                <p className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Nearest: {nearestPost.name}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Contact: {nearestPost.contact}
                </p>
                {nearestDist !== null && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {Math.round(nearestDist)}m away
                    {walkTimeToSecurity !== null && ` (~${walkTimeToSecurity} min walk)`}
                  </p>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-[11px]"
              onClick={() => setSosConfirmed(false)}
            >
              Cancel Alert
            </Button>
          </div>
        )}
      </Card>

      {/* Safety Info Card */}
      <Card className="border-l-4 border-l-amber-400 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Safety Info
          </h3>
        </div>

        {/* Nearest security */}
        {nearestPost && nearestDist !== null && (
          <div className="mb-3 rounded-lg border bg-muted/30 p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <Shield className="h-3.5 w-3.5 text-red-500" />
              Nearest Security Post
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{nearestPost.name}</p>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {Math.round(nearestDist)}m
              </span>
              {walkTimeToSecurity !== null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{walkTimeToSecurity} min walk
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-[11px]">
              <Phone className="h-3 w-3 text-emerald-600" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400">{nearestPost.contact}</span>
            </p>
          </div>
        )}

        {/* Emergency contact */}
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/50 p-2.5 dark:border-red-800 dark:bg-red-950/20">
          <Phone className="h-4 w-4 text-red-600" />
          <div>
            <p className="text-[10px] text-muted-foreground">Emergency Contact</p>
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">{EMERGENCY_CONTACT}</p>
          </div>
        </div>

        {/* Well-lit paths toggle */}
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-2.5">
          <div className="flex items-center gap-2">
            <Lamp className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-xs font-medium">Well-lit paths</p>
              <p className="text-[10px] text-muted-foreground">Prefer routes with good lighting</p>
            </div>
          </div>
          <Switch
            checked={wellLitPaths}
            onCheckedChange={onWellLitPathsChange}
            aria-label="Toggle well-lit paths"
          />
        </div>

        {/* Night mode indicator */}
        {isNight && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-800 dark:bg-amber-950/20">
            <Moon className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              It&apos;s after 8 PM — showing well-lit route options
            </p>
          </div>
        )}

        {/* Security posts list */}
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Security Posts
          </p>
          {SECURITY_POSTS.map((post) => {
            const loc = locations.find((l) => l.slug === post.slug);
            return (
              <div key={post.slug} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50">
                <Shield className="h-3 w-3 text-red-500" />
                <span className="flex-1 font-medium">{post.name}</span>
                {loc && (
                  <span className="text-[10px] text-muted-foreground">
                    ({loc.lat.toFixed(3)}, {loc.lng.toFixed(3)})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
