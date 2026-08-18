# IITGN Walk — Campus Navigation Intelligence

A **campus-specific** smart walking-route & travel-time platform for **IIT Gandhinagar (IITGN)**.
Unlike generic map apps, the routing graph is built from IITGN's internal roads, paths and
decision nodes — *not* third-party street tiles — and it learns from student-generated
walking data to refine travel-time predictions over time.

> What's the quickest/easiest walking route from where I am to where I'm going, and how
> long will it take **based on how I walk**?

---

## 📑 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Prerequisites](#-prerequisites)
4. [Installation](#-installation)
5. [Environment Variable Setup](#-environment-variable-setup)
6. [Database Setup](#-database-setup)
7. [Development Commands](#-development-commands)
8. [Production / Build Commands](#-production--build-commands)
9. [Project Structure](#-project-structure)
10. [Routing Algorithm](#-routing-algorithm)
11. [Walking-Speed Model](#-walking-speed-model-v1--v4)
12. [API Reference](#-api-reference)
13. [Database Schema](#-database-schema)
14. [External Dependencies](#-external-dependencies)
15. [Seed Data Disclaimer](#-seed-data-disclaimer)

---

## ✨ Project Overview

- **Multi-objective routing** — computes **Fastest**, **Shortest**, **Easiest** and one
  **Alternative** route simultaneously, so the user understands *why* a route is recommended.
  The shortest route (geometrically) is **not** assumed to be the fastest.
- **Mode-aware ETAs** — `Relaxed` / `Normal` / `Hurry` profiles, each with a tunable default
  walking speed that is **overridden by learned campus statistics** once journeys accrue.
- **Continuous learning** — after each completed journey the campus-level walking speed per
  mode is recomputed as `Σdistance / Σtime`, blended with defaults until ≥30 samples exist.
- **Self-contained map** — the campus map is drawn from our own GeoJSON dataset (building
  footprints, paths, POIs). No proprietary map tiles are copied. The map layer and the
  routing graph are **independently maintained**.
- **Privacy-first** — only anonymised GPS coordinates, timestamps and walking mode are stored.
  No PII.
- **Modular architecture** — UI, API, routing engine, database, geospatial data and analytics
  are separate. The single-path solver can be swapped for a more advanced engine later.
- **i18n** — English (`en`), Hindi (`hi`), Gujarati (`gu`).
- **PWA** — installable via `public/manifest.json` with offline-indicator UI.

---

## 🧱 Tech Stack

| Layer | Technology | Notes |
|------|------------|-------|
| Framework | **Next.js 16** (App Router) | TypeScript 5, Turbopack dev server |
| Language | **TypeScript 5** | strict mode end-to-end |
| Styling | **Tailwind CSS 4** + **shadcn/ui** (New York) | Lucide icons |
| Map | **MapLibre GL JS 6** | self-contained campus GeoJSON, no external tiles |
| Database | **SQLite + Prisma ORM 6** | `lat/lng` as `Float`; geo math in TS |
| State (client) | **Zustand 5** | localStorage-persisted |
| State (server) | **TanStack Query 5** | optional, scaffolded |
| Validation | **Zod 4** | API request schemas |
| Forms | **react-hook-form 7** + **@hookform/resolvers** | — |
| Animation | **Framer Motion 12** | UI transitions |
| Charts | **Recharts 2** | analytics dashboard |
| Theme | **next-themes** | light/dark/system |
| i18n | custom (`src/lib/i18n/`) | en / hi / gu |
| AI / Skills | **z-ai-web-dev-sdk** | backend only — TTS, smart-suggest, weather |
| Auth | **NextAuth.js 4** | scaffolded (not yet wired to UI) |
| Package manager | **Bun** | `bun.lock` committed |
| Linter | **ESLint 9** + `eslint-config-next` | core-web-vitals + typescript |

> The original brief suggested Python/FastAPI/PostgreSQL/PostGIS/NetworkX. To run reliably in
> a single-process Next.js environment (and to keep the routing engine type-safe
> end-to-end), the stack is adapted — **the architecture, data model and routing behaviour
> are preserved**, and the schema mirrors the Postgres/PostGIS design so it migrates 1:1.

---

## ✅ Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| **Bun** | ≥ 1.3 | Package manager, dev server, runtime. Download: https://bun.sh |
| **Node.js** | ≥ 20 (optional) | Bun can substitute; only required if you prefer `npm`/`npx` |
| **Git** | ≥ 2.40 | Version control |
| **OS** | macOS / Linux / Windows+WSL | tested on Linux |

Verify your install:

```bash
bun --version   # should print 1.3.x or higher
git --version
```

> The project pins Next.js 16, React 19, Prisma 6, Tailwind 4 — all installed
> automatically by `bun install`. No global installs are required.

---

## 📦 Installation

From a fresh clone:

```bash
git clone <your-repo-url> iitgn-walk
cd iitgn-walk

# install all dependencies (creates node_modules/, ~1.2 GB)
bun install
```

The first run may take a couple of minutes — Bun downloads all dependencies and Prisma
generates its client.

---

## 🔐 Environment Variable Setup

The project reads **one** environment variable. A template is provided:

```bash
# from project root
cp .env.example .env
```

`.env.example` contents:

```env
DATABASE_URL="file:../db/custom.db"
```

> The path is **relative to `prisma/schema.prisma`**, so `file:../db/custom.db` resolves to
> `<project-root>/db/custom.db` on any machine after a fresh clone. The `db/` folder and the
> SQLite file are created automatically on the first `bun run db:push` — you do not need to
> create them by hand.

The only other env var used by the code is `NODE_ENV`, which Next.js sets automatically
(`development` during `bun run dev`, `production` during `bun run start`).

**Secrets policy:** `.env` is git-ignored. Only `.env.example` is committed. Never put API
keys, tokens, or real credentials in `.env.example`.

---

## 🗄️ Database Setup

The DB is SQLite via Prisma. Setup is one command:

```bash
# 1. (already done above) cp .env.example .env

# 2. create the SQLite file from schema (idempotent)
bun run db:push
# → creates db/custom.db with the schema from prisma/schema.prisma
```

The schema defines 8 models: `Location`, `RoadNode`, `RoadEdge`, `WalkingProfile`,
`RouteResult`, `Journey`, `GpsPoint`, `CampusFeature`. See the full schema at
[`prisma/schema.prisma`](./prisma/schema.prisma).

**Seeding:** the app **idempotently self-seeds** on the first API call (campus locations,
road nodes/edges, building footprints). The seed dataset lives in
`src/lib/campus/seed.ts` and is a representative reconstruction of the IITGN campus layout.

Optional: pre-populate demo journeys with GPS traces for the journey-replay feature:

```bash
# requires the dev server to be running (see next section)
python3 scripts/seed-demo-journeys.py
```

Other useful Prisma commands:

```bash
bun run db:generate    # regenerate @prisma/client after schema edits
bun run db:migrate     # create + apply a migration (development)
bun run db:reset       # drop & recreate the DB (destructive!)
```

---

## 🚀 Development Commands

```bash
bun run dev            # start the dev server on http://localhost:3000 (Turbopack)
bun run lint           # run ESLint (core-web-vitals + typescript)
bun run db:push        # apply schema → SQLite (idempotent, with data-loss flag)
bun run db:generate     # regenerate Prisma client
bun run db:migrate      # create + apply a dev migration
bun run db:reset        # ⚠️ destructive: drop & recreate the DB
```

Recommended first-run sequence (clean clone):

```bash
cp .env.example .env
bun install
bun run db:push
bun run dev            # → open http://localhost:3000
```

The first `GET /api/campus` request will trigger the seed (a few hundred ms delay).

---

## 🏗️ Production / Build Commands

The Next.js config uses `output: "standalone"` (see `next.config.ts`), producing a
self-contained server bundle in `.next/standalone/`.

```bash
# 1. build the production bundle
bun run build
# → .next/standalone/server.js + static assets copied alongside

# 2. start the production server
bun run start
# → NODE_ENV=production bun .next/standalone/server.js
#   (listens on http://localhost:3000)

# 3. (optional) run the production server on a custom port
PORT=8080 bun run start
```

> ⚠️ The build script copies `.next/static` and `public/` into `.next/standalone/` so the
> standalone server can serve assets without the project root being present. If you alter
> `public/`, rebuild.

---

## 📁 Project Structure

```
iitgn-walk/
├── .env.example                  ← env-var template (committed)
├── .gitignore
├── README.md                    ← this file
├── bun.lock                     ← pinned dependency lockfile
├── package.json
├── next.config.ts               ← Next.js config (output: "standalone")
├── tsconfig.json                ← TS config (@/* → ./src/*)
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json              ← shadcn/ui (style: new-york)
├── Caddyfile                    ← sandbox gateway (optional, deploy only)
│
├── prisma/
│   └── schema.prisma            ← 8 models (Location, RoadNode, RoadEdge, …)
│
├── db/
│   └── custom.db                ← SQLite DB (auto-created, git-ignored)
│
├── public/                      ← static assets
│   ├── logo.svg
│   ├── manifest.json            ← PWA manifest
│   └── robots.txt
│
├── scripts/
│   └── seed-demo-journeys.py    ← optional: populate demo journeys + GPS traces
│
├── tests/                       ← runtime sanity shell scripts
│   ├── python-runtime-container.sh
│   ├── python-runtime-build.sh
│   └── database-runtime-build.sh
│
├── examples/
│   └── websocket/               ← reference snippets (frontend.tsx, server.ts)
│
├── worklog.md                   ← phase-by-phase development handover log
│
└── src/
    ├── app/
    │   ├── layout.tsx           ← root layout (Geist fonts, ThemeProvider, Toaster)
    │   ├── globals.css          ← Tailwind v4 + theme tokens + custom utility classes
    │   ├── page.tsx             ← main UI (Navigate / Analytics tabs + map)
    │   └── api/
    │       ├── route.ts                  ← /api base
    │       ├── campus/route.ts          ← GET full campus dataset for map
    │       ├── locations/route.ts        ← GET flat POI list
    │       ├── route-compute/route.ts    ← POST compute fastest/shortest/easiest/alt
    │       ├── journeys/route.ts         ← POST create / GET list
    │       ├── journeys/[id]/route.ts    ← GET one / PATCH complete (+ GPS trace)
    │       ├── analytics/route.ts        ← GET dashboard aggregates
    │       ├── profiles/route.ts         ← GET walking-speed model
    │       ├── events/route.ts           ← GET campus events
    │       ├── events/ics/route.ts      ← GET ICS calendar feed
    │       ├── announcements/route.ts   ← GET active announcements
    │       ├── campus-activity/route.ts ← GET campus activity feed
    │       ├── weather/route.ts         ← GET weather (z-ai-web-dev-sdk)
    │       ├── tts/route.ts             ← POST text-to-speech (z-ai-web-dev-sdk)
    │       └── smart-suggest/route.ts   ← GET smart next-class suggestion
    │
    ├── components/
    │   ├── ui/                          ← shadcn/ui (50+ primitives)
    │   ├── map/campus-map.tsx           ← MapLibre self-contained map
    │   ├── map/indoor-plan-view.tsx
    │   ├── planner/route-planner.tsx   ← FROM/TO/mode + Start Journey
    │   ├── planner/walking-buddy.tsx    ← pace-matching slider
    │   ├── planner/smart-suggestions.tsx
    │   ├── planner/quick-commute.tsx
    │   ├── route/route-comparison.tsx   ← fastest/shortest/easiest/alt cards
    │   ├── route/directions-panel.tsx
    │   ├── navigation/navigation-panel.tsx
    │   ├── navigation/journey-history.tsx
    │   ├── navigation/voice-navigator.tsx
    │   ├── navigation/voice-toggle.tsx
    │   ├── analytics/analytics-dashboard.tsx
    │   ├── events/events-panel.tsx
    │   ├── events/date-badge.tsx
    │   ├── tours/tours-panel.tsx
    │   ├── gamification/achievements-panel.tsx
    │   ├── gamification/badges-panel.tsx
    │   ├── gamification/challenges-panel.tsx
    │   ├── schedule/schedule-panel.tsx
    │   ├── safety/safety-panel.tsx
    │   ├── settings/settings-panel.tsx
    │   ├── onboarding/welcome-dialog.tsx
    │   ├── announcements/announcements-banner.tsx
    │   ├── weather-widget.tsx
    │   ├── offline-indicator.tsx
    │   ├── theme-provider.tsx
    │   └── theme-toggle.tsx
    │
    ├── hooks/
    │   ├── use-app-store.ts            ← Zustand store (localStorage-persisted)
    │   ├── use-geolocation.ts           ← Geolocation API (SSR-safe)
    │   ├── use-mobile.ts
    │   ├── use-toast.ts
    │   ├── use-url-sync.ts
    │   ├── use-voice-navigation.ts
    │   └── use-count-up.ts
    │
    └── lib/
        ├── db.ts                       ← Prisma client singleton
        ├── api-client.ts               ← typed frontend API client
        ├── utils.ts                    ← shadcn cn() helper
        ├── settings.ts
        ├── walking-stats.ts
        ├── geo/geo.ts                  ← haversine, bearing, map-matching
        ├── campus/
        │   ├── seed.ts                 ← IITGN seed dataset
        │   ├── loader.ts               ← idempotent seeding + cached graph
        │   ├── indoor-plans.ts
        │   ├── tours.ts
        │   ├── events.ts
        │   ├── ics.ts
        │   ├── schedule.ts
        │   ├── commute.ts
        │   ├── streak.ts
        │   ├── badges.ts
        │   └── poi-details.ts
        ├── routing/
        │   ├── types.ts                ← shared domain types
        │   ├── graph.ts                ← build in-memory Graph (bidirectional)
        │   ├── dijkstra.ts             ← binary-heap Dijkstra
        │   ├── astar.ts                ← A* with great-circle heuristic
        │   ├── cost.ts                 ← FASTEST / SHORTEST / EASIEST cost fns
        │   ├── router.ts                ← multi-objective computeRoutes + alt
        │   ├── profiles.ts             ← campus-level walking-speed learning
        │   ├── buddy.ts                ← pace-matching helpers
        │   ├── calories.ts
        │   ├── directions.ts           ← turn-by-turn direction generation
        │   └── share-url.ts
        └── i18n/
            ├── strings.ts             ← en / hi / gu dictionaries
            └── use-translation.ts     ← language hook
```

---

## 🗺️ Routing Algorithm

### Graph

The campus walking network is a graph `G = (V, E)`:
- **Nodes** `V` — road/path intersections, decision points, building entrances, campus gates
  and landmarks. Each entrance node `ENT-<location-slug>` is the door of a POI and connects
  to its nearest junction via a short entrance edge.
- **Edges** `E` — walkable roads/paths. Each edge carries `distanceM`,
  `estTimeSec` (baseline), `roadType`, `lighting`, `surfaceType`, `slope`, `trafficLevel`,
  `walkable`. Edges are stored directed in the DB but the in-memory builder
  (`buildGraph` in `graph.ts`) adds **both directions** to the adjacency list.

### Cost functions

`makeCostFn(objective, penaltyEdges?, penaltyMult?)` returns a per-edge cost. The router is
configurable: swap the cost function and you swap the objective.

| Objective | Edge cost | Minimises |
|-----------|-----------|-----------|
| `FASTEST` | `predictedEdgeTime` (seconds) = `distance / (speed · roadTypeFactor · slopeFactor · trafficFactor)` | predicted travel time |
| `SHORTEST` | `distanceM` (metres) | geometric distance |
| `EASIEST` | `predictedEdgeTime + (edgeDifficulty · distance / 200)` | time + physical-effort surcharge |

`edgeDifficulty` is a 0–100 score per edge: +25 for `STEPS`, +8 for `SERVICE`, +8/+10 for
`DIRT`/`GRASS`, +10/+4 for `NONE`/`PARTIAL` lighting, +12/+5 for `HIGH`/`MEDIUM` traffic, and
a slope term. `routeDifficulty` is the length-weighted average.

### Solvers

- **Dijkstra** — binary min-heap, `O((V+E) log V)`. (`dijkstra.ts`)
- **A\*** — same heap, with a great-circle admissible heuristic
  `h(n) = straightLineDistance(n, goal) / 2.2 m·s⁻¹`. (`astar.ts`)

Both take a pluggable `CostFn` so the objective is decided by the caller, not the solver.

### Multi-objective (`router.ts::computeRoutes`)

For a `(from, to, mode)` request the router:
1. resolves start/goal node slugs (location → `ENT-<slug>`, or `fromCoord` → nearest node);
2. runs A\* with `FASTEST`, `SHORTEST` and `EASIEST` cost functions in turn;
3. computes an **alternative** by penalising the fastest path's edge slugs (×4 cost) and
   re-running A\* — a lightweight substitute for Yen's k-shortest. The alternative is only
   surfaced if it's meaningfully different from the other three.

Each resulting path is re-assembled with accurate `distanceM`, `durationS`, `eta`,
`difficulty` and a human `reason`.

### Example (Hostel 3 → Academic Block 1)

| Route | Distance | Time | Difficulty |
|-------|----------|------|------------|
| **Fastest** | 606 m | 8 min | 7/100 |
| **Shortest** | 543 m | 11 min | 21/100 ← takes stairs, so slower |
| **Easiest** | 678 m | 10 min | 6/100 ← fully lit, no steps |
| **Alternative** | 650 m | 12 min | 15/100 |

The **shortest is slower than the fastest** — exactly the campus-specific insight a generic
map app misses.

---

## 🚶 Walking-Speed Model (V1 → V4)

| Version | Model | Status |
|---------|-------|--------|
| V1 | `distance / fixed_default_speed` | ✅ shipped (defaults in `types.ts`) |
| V2 | `distance / learned_campus_speed` | ✅ shipped (`profiles.ts::recomputeCampusSpeeds`) |
| V3 | edge-specific travel-time prediction | scaffolded — `predictedEdgeTime` already varies per edge by type/slope/traffic |
| V4 | ML model (route, distance, mode, time-of-day, weather) | deliberately **not** in MVP — collect clean data first |

After each completed journey, `recomputeCampusSpeeds()` recomputes per-mode campus speed as
`Σdistance / Σtime` across all completed journeys of that mode, **blended** with the default
(weight = `min(1, n/30)`) so predictions stay stable while samples are small.

---

## 🌐 API Reference

All routes are relative. Base path `/api`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/campus` | Full campus dataset for the map (buildings, network, POIs) |
| GET | `/api/locations` | Flat POI list |
| POST | `/api/route-compute` | Compute fastest/shortest/easiest/alt routes (Zod-validated) |
| POST | `/api/journeys` | Create a new in-progress journey |
| PATCH | `/api/journeys/[id]` | Complete a journey (+ GPS trace); triggers speed recompute |
| GET | `/api/journeys` `/api/journeys/[id]` | List / fetch one |
| GET | `/api/analytics` | Aggregated dashboard (mode stats, popular routes, reliability) |
| GET | `/api/profiles` | Current walking-speed model (defaults + learned) |
| GET | `/api/events` `/api/events/ics` | Campus events / iCalendar feed |
| GET | `/api/announcements?active=true` | Active announcement banner |
| GET | `/api/campus-activity` | Campus activity feed |
| GET | `/api/weather` | Weather (z-ai-web-dev-sdk) |
| POST | `/api/tts` | Text-to-speech (z-ai-web-dev-sdk) |
| GET | `/api/smart-suggest` | Smart next-class suggestion (z-ai-web-dev-sdk) |

---

## 🗄️ Database Schema

Prisma schema at [`prisma/schema.prisma`](./prisma/schema.prisma). Mirrors the requested
Postgres/PostGIS design; `Float` lat/lng pairs are a 1:1 migration target for
`geometry(Point, 4326)`.

- **Location** — POI (hostel, academic, dining, gate, …) with `entryNode` link into the graph.
- **RoadNode** — graph vertex (intersection / entrance / gate / landmark / decision / bend).
- **RoadEdge** — directed-but-bidirectional walkable edge with full routing attributes.
- **CampusFeature** — the *visual* campus map (building footprints / greens / courts).
  Kept **separate** from the routing graph so either can be re-surveyed independently.
- **WalkingProfile** — campus-level (or future user-level) learned speed per mode.
- **RouteResult** — snapshot of a computed route (path, distance, duration, difficulty).
- **Journey** — an actual walked trip (predicted vs actual time/distance, status).
- **GpsPoint** — anonymised GPS samples linked to a journey.

---

## 📦 External Dependencies

All declared in `package.json`. Key runtime dependencies:

| Package | Purpose |
|---------|---------|
| `next` 16, `react` 19, `react-dom` 19 | App framework |
| `prisma` + `@prisma/client` 6 | SQLite ORM |
| `maplibre-gl` 6 | Vector tile / GeoJSON map renderer |
| `zustand` 5 | Client state (with localStorage persistence) |
| `@tanstack/react-query` 5 | Server state |
| `zod` 4 | API request validation |
| `react-hook-form` + `@hookform/resolvers` | Forms |
| `framer-motion` 12 | Animations |
| `recharts` 2 | Analytics charts |
| `next-themes` | Light/dark/system |
| `next-auth` 4 | Auth (scaffolded) |
| `next-intl` 4 | i18n helpers (scaffolded alongside custom `src/lib/i18n`) |
| `lucide-react` | Icons |
| `tailwindcss` 4 + `tailwindcss-animate` + `tw-animate-css` | Styling |
| `class-variance-authority`, `clsx`, `tailwind-merge` | shadcn utilities |
| `cmdk`, `vaul`, `sonner`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `react-syntax-highlighter`, `react-markdown`, `@mdxeditor/editor`, `input-otp`, `react-hook-form`, `uuid`, `date-fns`, `sharp` | shadcn/ui + auxiliary |
| `z-ai-web-dev-sdk` | AI Skills (TTS, weather, smart-suggest) — **backend only** |
| `@dnd-kit/*` | Drag-and-drop (sortable lists) |
| `@radix-ui/*` (24 primitives) | shadcn/ui primitives |

Dev dependencies: `typescript` 5, `eslint` 9 + `eslint-config-next` 16, `@types/react` 19,
`@types/react-dom` 19, `bun-types`, `tailwindcss` 4, `@tailwindcss/postcss`, `tw-animate-css`.

### Required environment variables

| Variable | Required | Default in template | Used by |
|----------|----------|---------------------|---------|
| `DATABASE_URL` | ✅ | `file:../db/custom.db` | `prisma/schema.prisma` → SQLite path |
| `NODE_ENV` | auto-set by Next.js | — | `src/lib/db.ts` (singleton guard) |

No API keys or third-party tokens are required to run the project locally. The
`z-ai-web-dev-sdk` works in the sandbox without credentials; if you deploy outside the
sandbox, refer to the SDK docs for any required configuration.

---

## 🔌 Extending

- **Replace the campus map** — edit `CampusFeature` rows (or `SEED_BUILDINGS`). The router
  is untouched.
- **Replace the routing graph** — edit `RoadNode`/`RoadEdge` rows (or `SEED_*`). The map
  reads from the same DB but a different table, so it's unaffected.
- **Swap the solver** — implement a function with the same signature as `astar()` and call
  it from `computeRoutes()`.
- **Add a new objective** — add a case to `makeCostFn` and to the `objective` union.
- **Migrate to PostGIS** — `Float lat/lng` → `geometry(Point,4326)`; rewrite `haversine`
  calls as `ST_Distance`/`ST_DWithin` queries. The TS routing engine can stay or be replaced
  by a Python/NetworkX service behind the same REST contract.

---

## 📝 Seed Data Disclaimer

`src/lib/campus/seed.ts` is a **manually-entered representative reconstruction** of the IITGN
campus. Coordinates are placed on a realistic local grid around the documented campus
centre. **Replace with a verified geospatial survey (GPS field survey or the official campus
CAD/shapefile) before production use.** Every seed entry is tagged so the production
replacement is unambiguous.

---

## 📄 License

Private project. All rights reserved.
