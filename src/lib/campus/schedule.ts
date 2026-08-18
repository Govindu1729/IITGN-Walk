// Class schedule data for IIT Gandhinagar campus navigation integration.
// Sample realistic course entries + localStorage persistence for custom schedules.

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export interface ClassEntry {
  id: string;
  courseName: string;
  courseCode: string;
  day: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string; // "09:50"
  locationSlug: string; // "ab1", "lhc", etc.
  instructor?: string;
}

/** Location slug → display name mapping for schedule display */
export const SCHEDULE_LOCATION_NAMES: Record<string, string> = {
  "ab1": "Academic Block 1",
  "ab2": "Academic Block 2",
  "ab3": "Academic Block 3",
  "lhc": "Lecture Hall Complex",
  "dining-hall": "Dining Hall",
  "library": "Library",
  "sports-complex": "Sports Complex",
  "admin-block": "Admin Block",
};

/** Sample class schedule — realistic IITGN courses */
export const SAMPLE_SCHEDULE: ClassEntry[] = [
  {
    id: "ma101-mon",
    courseName: "Calculus",
    courseCode: "MA101",
    day: "MON",
    startTime: "09:00",
    endTime: "09:50",
    locationSlug: "ab1",
    instructor: "Prof. Anil Kumar",
  },
  {
    id: "ma101-wed",
    courseName: "Calculus",
    courseCode: "MA101",
    day: "WED",
    startTime: "09:00",
    endTime: "09:50",
    locationSlug: "ab1",
    instructor: "Prof. Anil Kumar",
  },
  {
    id: "cs201-mon",
    courseName: "Data Structures",
    courseCode: "CS201",
    day: "MON",
    startTime: "10:00",
    endTime: "10:50",
    locationSlug: "ab3",
    instructor: "Prof. Meena Shah",
  },
  {
    id: "cs201-wed",
    courseName: "Data Structures",
    courseCode: "CS201",
    day: "WED",
    startTime: "10:00",
    endTime: "10:50",
    locationSlug: "ab3",
    instructor: "Prof. Meena Shah",
  },
  {
    id: "ph101-tue",
    courseName: "Physics",
    courseCode: "PH101",
    day: "TUE",
    startTime: "09:00",
    endTime: "09:50",
    locationSlug: "lhc",
    instructor: "Prof. Ravi Iyer",
  },
  {
    id: "ph101-thu",
    courseName: "Physics",
    courseCode: "PH101",
    day: "THU",
    startTime: "09:00",
    endTime: "09:50",
    locationSlug: "lhc",
    instructor: "Prof. Ravi Iyer",
  },
  {
    id: "ec101-tue",
    courseName: "Economics",
    courseCode: "EC101",
    day: "TUE",
    startTime: "11:00",
    endTime: "11:50",
    locationSlug: "ab2",
    instructor: "Prof. Sunita Patel",
  },
  {
    id: "ec101-thu",
    courseName: "Economics",
    courseCode: "EC101",
    day: "THU",
    startTime: "11:00",
    endTime: "11:50",
    locationSlug: "ab2",
    instructor: "Prof. Sunita Patel",
  },
  {
    id: "me201-wed",
    courseName: "Thermodynamics",
    courseCode: "ME201",
    day: "WED",
    startTime: "14:00",
    endTime: "14:50",
    locationSlug: "ab1",
    instructor: "Prof. Deepak Rao",
  },
  {
    id: "me201-fri",
    courseName: "Thermodynamics",
    courseCode: "ME201",
    day: "FRI",
    startTime: "14:00",
    endTime: "14:50",
    locationSlug: "ab1",
    instructor: "Prof. Deepak Rao",
  },
  {
    id: "hs201-mon",
    courseName: "Humanities",
    courseCode: "HS201",
    day: "MON",
    startTime: "16:00",
    endTime: "16:50",
    locationSlug: "lhc",
    instructor: "Prof. Kavita Sharma",
  },
  {
    id: "bt101-thu",
    courseName: "Biology",
    courseCode: "BT101",
    day: "THU",
    startTime: "14:00",
    endTime: "14:50",
    locationSlug: "ab3",
    instructor: "Prof. Neha Gupta",
  },
  {
    id: "ch101-fri",
    courseName: "Chemistry",
    courseCode: "CH101",
    day: "FRI",
    startTime: "10:00",
    endTime: "10:50",
    locationSlug: "ab2",
    instructor: "Prof. Amit Joshi",
  },
  {
    id: "pe101-sat",
    courseName: "Physical Education",
    courseCode: "PE101",
    day: "SAT",
    startTime: "09:00",
    endTime: "09:50",
    locationSlug: "sports-complex",
    instructor: "Coach Ramesh",
  },
  {
    id: "ee101-tue",
    courseName: "Electrical Engineering",
    courseCode: "EE101",
    day: "TUE",
    startTime: "14:00",
    endTime: "14:50",
    locationSlug: "ab1",
    instructor: "Prof. Vikram Singh",
  },
  {
    id: "ee101-thu",
    courseName: "Electrical Engineering",
    courseCode: "EE101",
    day: "THU",
    startTime: "14:00",
    endTime: "14:50",
    locationSlug: "ab1",
    instructor: "Prof. Vikram Singh",
  },
];

const STORAGE_KEY = "iitgn-class-schedule";

/** Get the current day of week as our DayOfWeek type */
export function getCurrentDay(): DayOfWeek {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const map: Record<number, DayOfWeek> = {
    1: "MON",
    2: "TUE",
    3: "WED",
    4: "THU",
    5: "FRI",
    6: "SAT",
  };
  return map[jsDay] ?? "MON"; // default to MON for Sunday
}

/** Parse "HH:MM" to minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Get class status based on current time */
export function getClassStatus(
  startTime: string,
  endTime: string,
): "upcoming" | "in_progress" | "completed" {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);

  if (nowMins < startMins) return "upcoming";
  if (nowMins >= startMins && nowMins <= endMins) return "in_progress";
  return "completed";
}

/**
 * Load the class schedule.
 * Custom entries from localStorage override/extend the sample schedule.
 */
export function loadSchedule(): ClassEntry[] {
  if (typeof window === "undefined") return SAMPLE_SCHEDULE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_SCHEDULE;
    const custom = JSON.parse(raw) as ClassEntry[];
    // Merge: custom entries replace sample entries with the same id
    const customIds = new Set(custom.map((c) => c.id));
    const merged = [
      ...SAMPLE_SCHEDULE.filter((s) => !customIds.has(s.id)),
      ...custom,
    ];
    return merged;
  } catch {
    return SAMPLE_SCHEDULE;
  }
}

/** Save a custom schedule to localStorage */
export function saveSchedule(entries: ClassEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

/** Get today's classes, sorted by start time */
export function getTodayClasses(schedule?: ClassEntry[]): ClassEntry[] {
  const entries = schedule ?? loadSchedule();
  const today = getCurrentDay();
  return entries
    .filter((e) => e.day === today)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/** Get the next upcoming class from today's schedule */
export function getNextClass(schedule?: ClassEntry[]): ClassEntry | null {
  const todayClasses = getTodayClasses(schedule);
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  return (
    todayClasses.find((c) => timeToMinutes(c.startTime) > nowMins) ?? null
  );
}

/** Day labels for display */
export const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};
