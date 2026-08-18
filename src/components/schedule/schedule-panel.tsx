"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Navigation2,
  Plus,
  Trash2,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import {
  type ClassEntry,
  type DayOfWeek,
  loadSchedule,
  saveSchedule,
  getTodayClasses,
  getNextClass,
  getClassStatus,
  getCurrentDay,
  SCHEDULE_LOCATION_NAMES,
  DAY_LABELS,
  SAMPLE_SCHEDULE,
} from "@/lib/campus/schedule";
import { cn } from "@/lib/utils";

interface SchedulePanelProps {
  onNavigateToClass: (locationSlug: string) => void;
}

export function SchedulePanel({ onNavigateToClass }: SchedulePanelProps) {
  const [schedule, setSchedule] = useState<ClassEntry[]>(() => {
    // Hydrate from localStorage lazily on first render
    if (typeof window === "undefined") return SAMPLE_SCHEDULE;
    try {
      return loadSchedule();
    } catch {
      return SAMPLE_SCHEDULE;
    }
  });
  const [open, setOpen] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  // Live status tick — re-render every 30s so "Up next" / "In progress" /
  // "Completed" badges stay accurate as time progresses without a page reload.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const today = getCurrentDay();
  const todayClasses = useMemo(
    () => getTodayClasses(schedule),
    [schedule, today]
  );
  const nextClass = useMemo(() => getNextClass(schedule), [schedule, today]);

  const handleDeleteEntry = useCallback(
    (id: string) => {
      const updated = schedule.filter((e) => e.id !== id);
      setSchedule(updated);
      saveSchedule(updated);
    },
    [schedule],
  );

  const handleAddEntry = useCallback(
    (entry: ClassEntry) => {
      const updated = [...schedule, entry];
      setSchedule(updated);
      saveSchedule(updated);
    },
    [schedule],
  );

  if (typeof window === "undefined") return null;

  return (
    <Card className="hover-lift rounded-xl border border-teal-200/40 bg-gradient-to-br from-teal-50/30 to-emerald-50/20 p-4 shadow-premium-1 dark:border-teal-900/40 dark:from-teal-950/20 dark:to-emerald-950/10">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-teal-500 dark:text-teal-400" />
            <span className="text-sm font-semibold">
              Today&apos;s Classes
            </span>
            <Badge variant="secondary" className="text-[9px]">
              {DAY_LABELS[today]}
            </Badge>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          {todayClasses.length === 0 ? (
            <div className="mt-3 text-center">
              <p className="text-sm text-muted-foreground">
                No more classes today — explore campus!
              </p>
              <GraduationCap className="mx-auto mt-2 h-8 w-8 text-teal-300/60 dark:text-teal-700/60" />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {todayClasses.map((cls) => {
                const status = getClassStatus(cls.startTime, cls.endTime);
                const locationName =
                  SCHEDULE_LOCATION_NAMES[cls.locationSlug] ??
                  cls.locationSlug;

                return (
                  <div
                    key={cls.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-2.5 transition-colors",
                      status === "in_progress"
                        ? "border-amber-300/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20"
                        : status === "completed"
                          ? "border-slate-200/40 bg-slate-50/30 opacity-60 dark:border-slate-800/30 dark:bg-slate-900/20"
                          : "border-teal-200/40 bg-white/60 dark:border-teal-800/30 dark:bg-slate-900/40",
                    )}
                  >
                    {/* Status indicator */}
                    <div className="mt-0.5 shrink-0">
                      {status === "upcoming" && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                        </span>
                      )}
                      {status === "in_progress" && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-600" />
                        </span>
                      )}
                      {status === "completed" && (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-400" />
                      )}
                    </div>

                    {/* Class info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                          {cls.courseCode}
                        </span>
                        <span className="truncate text-xs font-medium">
                          {cls.courseName}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {cls.startTime} – {cls.endTime}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {locationName}
                        </span>
                      </div>
                      {status === "upcoming" && (
                        <Badge className="mt-1 bg-emerald-100 text-[9px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Up next
                        </Badge>
                      )}
                      {status === "in_progress" && (
                        <Badge className="mt-1 bg-amber-100 text-[9px] text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          In progress
                        </Badge>
                      )}
                      {status === "completed" && (
                        <Badge variant="secondary" className="mt-1 text-[9px]">
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Navigate to next class button */}
          {nextClass && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                className={cn(
                  "flex-1 gap-1.5 text-xs",
                  "bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-premium-2",
                )}
                onClick={() => onNavigateToClass(nextClass.locationSlug)}
              >
                <Navigation2 className="h-3.5 w-3.5" />
                Navigate to next class
                <Badge
                  variant="secondary"
                  className="ml-1 gap-0.5 bg-white/20 text-[8px] text-white"
                >
                  <Sparkles className="h-2 w-2" />
                  Smart
                </Badge>
              </Button>
            </div>
          )}

          {/* Edit schedule button */}
          <div className="mt-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                >
                  <Plus className="h-3 w-3" />
                  Edit Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Class Schedule</DialogTitle>
                </DialogHeader>
                <ScheduleEditor
                  schedule={schedule}
                  onAdd={handleAddEntry}
                  onDelete={handleDeleteEntry}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/** Schedule editor dialog content */
function ScheduleEditor({
  schedule,
  onAdd,
  onDelete,
}: {
  schedule: ClassEntry[];
  onAdd: (entry: ClassEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [day, setDay] = useState<DayOfWeek>("MON");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:50");
  const [locationSlug, setLocationSlug] = useState("ab1");

  const handleAdd = useCallback(() => {
    if (!courseCode.trim() || !courseName.trim()) return;
    const entry: ClassEntry = {
      id: `${courseCode.toLowerCase()}-${day.toLowerCase()}-${startTime.replace(":", "")}-${Date.now()}`,
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      day,
      startTime,
      endTime,
      locationSlug,
    };
    onAdd(entry);
    setCourseCode("");
    setCourseName("");
  }, [courseCode, courseName, day, startTime, endTime, locationSlug, onAdd]);

  // Group schedule by day for display
  const groupedByDay = useMemo(() => {
    const days: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return days.map((d) => ({
      day: d,
      classes: schedule
        .filter((e) => e.day === d)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
  }, [schedule]);

  return (
    <div className="space-y-4">
      {/* Add new class form */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-semibold">Add a Class</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Course Code</Label>
            <Input
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="CS301"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Course Name</Label>
            <Input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Algorithms"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Day</Label>
            <Select value={day} onValueChange={(v) => setDay(v as DayOfWeek)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DAY_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Location</Label>
            <Select value={locationSlug} onValueChange={setLocationSlug}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCHEDULE_LOCATION_NAMES).map(
                  ([slug, name]) => (
                    <SelectItem key={slug} value={slug} className="text-xs">
                      {name}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Start Time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">End Time</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <Button
          size="sm"
          className="mt-2 w-full gap-1 text-xs"
          onClick={handleAdd}
          disabled={!courseCode.trim() || !courseName.trim()}
        >
          <Plus className="h-3 w-3" />
          Add Class
        </Button>
      </div>

      {/* Current schedule list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold">Current Schedule</p>
        {groupedByDay.map(({ day: d, classes }) => {
          if (classes.length === 0) return null;
          return (
            <div key={d}>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {DAY_LABELS[d]}
              </p>
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs"
                >
                  <div className="flex-1">
                    <span className="font-bold text-teal-700 dark:text-teal-300">
                      {cls.courseCode}
                    </span>{" "}
                    <span>{cls.courseName}</span>
                    <span className="ml-2 text-muted-foreground">
                      {cls.startTime}–{cls.endTime} @{" "}
                      {SCHEDULE_LOCATION_NAMES[cls.locationSlug] ??
                        cls.locationSlug}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => onDelete(cls.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
