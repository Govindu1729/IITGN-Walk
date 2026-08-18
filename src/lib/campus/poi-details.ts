// Detailed information for each campus location / POI.
// Used by the rich POI detail card shown when a user clicks a location on the map.

export interface PoiDetails {
  slug: string;
  description: string;
  openingHours?: string; // e.g. "8:00 AM - 10:00 PM"
  amenities?: string[]; // e.g. ["Wi-Fi", "AC", "Vending Machine", "Water Cooler"]
  capacity?: number;
  floorCount?: number;
  departments?: string[];
  contactNumber?: string;
  imageDescription?: string; // alt text for placeholder image
  tags?: string[]; // e.g. ["Quiet Zone", "Group Study", "24/7 Access"]
}

export const POI_DETAILS: Record<string, PoiDetails> = {
  "main-gate": {
    slug: "main-gate",
    description: "Primary vehicular and pedestrian entrance on the Palaj side. Security checkpoint with 24/7 guard presence and visitor registration.",
    openingHours: "24/7",
    amenities: ["Security", "Visitor Parking", "CCTV"],
    contactNumber: "+91-79-XXXX-1001",
    tags: ["24/7 Access", "Security Post"],
  },
  "north-gate": {
    slug: "north-gate",
    description: "Back gate toward the residential colony. Open during daytime hours with intermittent guard presence.",
    openingHours: "7:00 AM - 10:00 PM",
    amenities: ["Security", "Bicycle Parking"],
    contactNumber: "+91-79-XXXX-1002",
    tags: ["Security Post"],
  },
  "east-gate": {
    slug: "east-gate",
    description: "Pedestrian-only gate on the east perimeter, convenient for reaching the admin block and health centre.",
    openingHours: "6:00 AM - 10:00 PM",
    amenities: ["Security", "CCTV"],
    contactNumber: "+91-79-XXXX-1003",
    tags: ["Pedestrian Only", "Security Post"],
  },
  "hostel-1": {
    slug: "hostel-1",
    description: "One of the original hostel blocks, housing undergraduate male students. Features common rooms and a small kitchenette.",
    openingHours: "24/7 (Residents only)",
    amenities: ["Wi-Fi", "Laundry", "Common Room", "Water Cooler"],
    capacity: 180,
    floorCount: 4,
    tags: ["Residential", "Quiet Zone 10 PM–6 AM"],
  },
  "hostel-2": {
    slug: "hostel-2",
    description: "Undergraduate male hostel adjacent to the central dining hall. Recently renovated washrooms.",
    openingHours: "24/7 (Residents only)",
    amenities: ["Wi-Fi", "Laundry", "Common Room", "Water Cooler"],
    capacity: 180,
    floorCount: 4,
    tags: ["Residential", "Quiet Zone 10 PM–6 AM"],
  },
  "hostel-3": {
    slug: "hostel-3",
    description: "Central hostel block, closest to the main spine and academic area. Popular for its proximity to LHC.",
    openingHours: "24/7 (Residents only)",
    amenities: ["Wi-Fi", "Laundry", "Common Room", "Vending Machine", "Water Cooler"],
    capacity: 200,
    floorCount: 4,
    tags: ["Residential", "Quiet Zone 10 PM–6 AM"],
  },
  "hostel-4": {
    slug: "hostel-4",
    description: "Undergraduate hostel east of the central spine. Equipped with a small gym in the basement.",
    openingHours: "24/7 (Residents only)",
    amenities: ["Wi-Fi", "Laundry", "Common Room", "Mini Gym", "Water Cooler"],
    capacity: 180,
    floorCount: 4,
    tags: ["Residential", "Quiet Zone 10 PM–6 AM"],
  },
  "hostel-5": {
    slug: "hostel-5",
    description: "Postgraduate and research scholar hostel. Single-occupancy rooms with attached bathrooms.",
    openingHours: "24/7 (Residents only)",
    amenities: ["Wi-Fi", "Laundry", "Common Room", "AC", "Water Cooler"],
    capacity: 120,
    floorCount: 4,
    tags: ["Residential", "PG Only"],
  },
  "hostel-6": {
    slug: "hostel-6",
    description: "Postgraduate hostel near the shopping complex. Spacious rooms with study tables.",
    openingHours: "24/7 (Residents only)",
    amenities: ["Wi-Fi", "Laundry", "Common Room", "AC", "Water Cooler"],
    capacity: 120,
    floorCount: 4,
    tags: ["Residential", "PG Only"],
  },
  "hostel-7": {
    slug: "hostel-7",
    description: "Newer hostel block with modern amenities. Includes a rooftop lounge with campus views.",
    openingHours: "24/7 (Residents only)",
    amenities: ["Wi-Fi", "Laundry", "Common Room", "AC", "Rooftop Lounge", "Water Cooler"],
    capacity: 160,
    floorCount: 5,
    tags: ["Residential", "New Building"],
  },
  "dining-hall": {
    slug: "dining-hall",
    description: "Main dining facility (mess) serving breakfast, lunch, snacks, and dinner. Offers both vegetarian and non-vegetarian options with rotating menus.",
    openingHours: "7:30 AM - 9:30 AM, 12:00 PM - 2:00 PM, 5:00 PM - 6:30 PM, 7:30 PM - 9:30 PM",
    amenities: ["AC", "Water Cooler", "Hand Wash", "CCTV"],
    capacity: 500,
    floorCount: 2,
    contactNumber: "+91-79-XXXX-2001",
    tags: ["Vegetarian", "Non-Vegetarian", "Meal Plan"],
  },
  "shopping-complex": {
    slug: "shopping-complex",
    description: "Campus convenience store featuring an Amul parlour, stationery shop, and a small café. Great for quick snacks and supplies.",
    openingHours: "8:00 AM - 11:00 PM",
    amenities: ["Amul Parlour", "Stationery", "Café", "ATM"],
    capacity: 50,
    tags: ["Snacks", "Essentials", "Late Night"],
  },
  "sports-complex": {
    slug: "sports-complex",
    description: "Multi-sport facility with a well-equipped gymnasium, indoor badminton courts, and table tennis. Changing rooms with hot water available.",
    openingHours: "6:00 AM - 10:00 PM",
    amenities: ["Gymnasium", "Badminton Courts", "Table Tennis", "Changing Rooms", "Water Cooler"],
    capacity: 150,
    floorCount: 2,
    contactNumber: "+91-79-XXXX-3001",
    tags: ["Indoor Sports", "Gym"],
  },
  "football-ground": {
    slug: "football-ground",
    description: "Large open ground used for football and cricket. Floodlit for evening practice sessions.",
    openingHours: "6:00 AM - 10:00 PM",
    amenities: ["Floodlights", "Seating", "Water Cooler"],
    tags: ["Outdoor Sports", "Floodlit", "Cricket", "Football"],
  },
  "tennis-courts": {
    slug: "tennis-courts",
    description: "Synthetic-surface tennis courts and a dedicated basketball court. Booking required through the sports office.",
    openingHours: "6:00 AM - 9:00 PM",
    amenities: ["Synthetic Surface", "Booking System", "Water Cooler"],
    tags: ["Outdoor Sports", "Booking Required", "Tennis", "Basketball"],
  },
  "lhc": {
    slug: "lhc",
    description: "Central Lecture Hall Complex with 8+ lecture halls of varying capacities. Equipped with projectors, whiteboards, and audio systems in every room.",
    openingHours: "8:00 AM - 9:00 PM",
    amenities: ["Wi-Fi", "Projectors", "AC", "Whiteboards", "Audio System", "Water Cooler"],
    capacity: 800,
    floorCount: 3,
    tags: ["Classrooms", "AC", "Projector Equipped"],
  },
  "ab1": {
    slug: "ab1",
    description: "Academic Block 1 housing the Computer Science and Mathematics departments. Faculty offices, research labs, and seminar rooms.",
    openingHours: "8:00 AM - 10:00 PM",
    amenities: ["Wi-Fi", "AC", "Seminar Room", "Printer", "Water Cooler"],
    capacity: 300,
    floorCount: 4,
    departments: ["Computer Science & Engineering", "Mathematics"],
    tags: ["Academic", "Research Labs"],
  },
  "ab2": {
    slug: "ab2",
    description: "Academic Block 2 with Electrical and Mechanical Engineering departments. Includes workshops and lab spaces.",
    openingHours: "8:00 AM - 10:00 PM",
    amenities: ["Wi-Fi", "AC", "Workshop", "Lab Space", "Water Cooler"],
    capacity: 250,
    floorCount: 4,
    departments: ["Electrical Engineering", "Mechanical Engineering"],
    tags: ["Academic", "Workshops"],
  },
  "ab3": {
    slug: "ab3",
    description: "Academic Block 3, primarily used for labs. Houses chemistry, physics, and interdisciplinary research facilities.",
    openingHours: "8:00 AM - 10:00 PM",
    amenities: ["Wi-Fi", "AC", "Fume Hoods", "Lab Equipment", "Water Cooler"],
    capacity: 200,
    floorCount: 4,
    departments: ["Chemistry", "Physics", "Interdisciplinary Programs"],
    tags: ["Academic", "Lab Heavy"],
  },
  "ab4": {
    slug: "ab4",
    description: "Academic Block 4 with Humanities & Social Sciences and the Design department. Creative spaces and discussion rooms available.",
    openingHours: "8:00 AM - 10:00 PM",
    amenities: ["Wi-Fi", "AC", "Discussion Room", "Creative Space", "Water Cooler"],
    capacity: 200,
    floorCount: 3,
    departments: ["Humanities & Social Sciences", "Design"],
    tags: ["Academic", "Creative Space"],
  },
  "ab5": {
    slug: "ab5",
    description: "Academic Block 5, the newest block. Houses Bio-engineering and additional research centres with state-of-the-art facilities.",
    openingHours: "8:00 AM - 10:00 PM",
    amenities: ["Wi-Fi", "AC", "Research Lab", "Clean Room", "Water Cooler"],
    capacity: 150,
    floorCount: 3,
    departments: ["Bio-engineering", "Research Centres"],
    tags: ["Academic", "New Building"],
  },
  "library": {
    slug: "library",
    description: "Central Library & Learning Resource Centre with 50,000+ volumes, digital archives, and e-journal access. Individual carrels, group study rooms, and a 24/7 reading hall during exam season.",
    openingHours: "8:00 AM - 10:00 PM (Reading Hall: 24/7 during exams)",
    amenities: ["Wi-Fi", "AC", "Photocopier", "Scanner", "Group Study Room", "Individual Carrels", "Water Cooler", "Vending Machine"],
    capacity: 400,
    floorCount: 3,
    contactNumber: "+91-79-XXXX-4001",
    tags: ["Quiet Zone", "Group Study", "24/7 During Exams", "Digital Access"],
  },
  "computer-centre": {
    slug: "computer-centre",
    description: "Central computing facility with high-performance workstations, printers, and campus network services. Open for all students.",
    openingHours: "8:00 AM - 11:00 PM",
    amenities: ["Wi-Fi", "AC", "Workstations", "Printer", "Scanner"],
    capacity: 100,
    floorCount: 2,
    tags: ["Computing", "Printing", "High-Speed Internet"],
  },
  "admin-block": {
    slug: "admin-block",
    description: "Campus administration headquarters. Houses the Director's office, Registrar, Dean of Student Affairs, and the finance department.",
    openingHours: "9:00 AM - 5:30 PM (Mon–Fri)",
    amenities: ["Wi-Fi", "AC", "Visitor Waiting", "Printer"],
    capacity: 80,
    floorCount: 3,
    contactNumber: "+91-79-XXXX-5001",
    tags: ["Administration", "Office Hours Only"],
  },
  "health-centre": {
    slug: "health-centre",
    description: "Campus health centre with a resident doctor, pharmacy, and first-aid facilities. Ambulance available for emergencies.",
    openingHours: "8:00 AM - 10:00 PM (Emergency: 24/7)",
    amenities: ["Pharmacy", "First Aid", "Ambulance", "Wheelchair Access", "AC"],
    capacity: 20,
    contactNumber: "+91-79-XXXX-6001",
    tags: ["Medical", "Emergency 24/7", "Pharmacy"],
  },
  "central-plaza": {
    slug: "central-plaza",
    description: "Open quadrangle at the heart of campus. Used for informal gatherings, student events, and as a meeting point. Benches and shade trees available.",
    amenities: ["Seating", "Shade Trees", "Wi-Fi"],
    tags: ["Open Space", "Meeting Point", "Event Space"],
  },
  "amphitheatre": {
    slug: "amphitheatre",
    description: "Open-air amphitheatre used for cultural performances, movie screenings, and student club events. Seats ~300 with stepped stone seating.",
    openingHours: "6:00 AM - 11:00 PM",
    amenities: ["Stage Lighting", "Sound System", "Seating"],
    capacity: 300,
    tags: ["Cultural", "Open Air", "Event Space"],
  },
};

/** Get POI details for a slug, with a fallback for unknown locations. */
export function getPoiDetails(slug: string): PoiDetails | null {
  return POI_DETAILS[slug] ?? null;
}

/** Check if a POI is currently open based on its openingHours string. */
export function isPoiOpen(openingHours?: string): "open" | "closed" | "unknown" {
  if (!openingHours || openingHours.includes("24/7")) return "open";
  // Simple heuristic: parse first time range
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotal = currentHour * 60 + currentMinute;

  // Match patterns like "8:00 AM - 10:00 PM" or "7:30 AM - 9:30 AM, 12:00 PM - 2:00 PM"
  const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
  const matches = [...openingHours.matchAll(timePattern)];

  if (matches.length === 0) return "unknown";

  for (const m of matches) {
    let startH = parseInt(m[1]);
    const startM = parseInt(m[2]);
    if (m[3].toUpperCase() === "PM" && startH !== 12) startH += 12;
    if (m[3].toUpperCase() === "AM" && startH === 12) startH = 0;
    let endH = parseInt(m[4]);
    const endM = parseInt(m[5]);
    if (m[6].toUpperCase() === "PM" && endH !== 12) endH += 12;
    if (m[6].toUpperCase() === "AM" && endH === 12) endH = 0;
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    if (currentTotal >= startTotal && currentTotal <= endTotal) return "open";
  }

  return "closed";
}
