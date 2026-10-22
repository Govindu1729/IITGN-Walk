# 🏗️ Architecture — IITGN Walk

> Documents the current system architecture of the IITGN Walk campus navigation platform.
> Reviewed and refreshed during the 2026-10-20 morning checkup. No live architecture changes were made — this is a record of the existing design.

---

## 1. Overview

**IITGN Walk** is a campus-specific smart walking-route and travel-time platform for IIT Gandhinagar (IITGN). Unlike generic map apps, the routing graph is built from IITGN's internal roads, paths, and decision nodes (not third-party street tiles), and it learns from student-generated walking data to refine travel-time predictions over time.

**Core question it answers:** *What's the quickest/easiest walking route from where I am to where I'm going, and how long will it take based on how I walk?*

---

## 2. Technology Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Framework | Next.js | 16.1.1 | App Router, API routes, SSR/SSG, Turbopack |
| UI | React | 19.0.0 | Component framework |
| Styling | Tailwind CSS | 4 | Utility-first CSS (PostCSS) |
| UI primitives | shadcn/ui + Radix UI | — | Accessible component primitives |
| Maps | MapLibre GL | 6.4.0 | Vector campus map (self-hosted style) |
| Database ORM | Prisma | 6.11.1 | Data modeling + migrations |
| Database | SQLite (dev) / PostgreSQL + Neon (prod) | — | Journey, profile, activity storage |
| State | Zustand | 5.0.6 | Client state (app store, map, planner) |
| Data fetching | TanStack Query | 5.82.0 | Server state caching |
| Forms | React Hook Form + Zod | 7.60.0 / 4.0.2 | Form management + validation |
| i18n | next-intl | 4.3.4 | English / Hindi / Gujarati |
| Animations | Framer Motion | 12.23.2 | Transitions, micro-interactions |
| Package manager | Bun | — | Install, build, run |
| Deployment | Vercel (serverless, `sin1` region) | — | Production hosting |
| Auth | next-auth | 4.24.11 | Session management (configured) |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Next.js App Router)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │    State (Zustand)  │  │
│  │  (App Rtr)  │  │  (shadcn)   │  │   + TanStack Query  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │             │
│         └────────────────┴────────────────────┘             │
│                     HTTP / API Routes                        │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   API Layer       │
                    │  /api/* routes    │
                    │  (rate limited)   │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
   ┌──────▼──────┐   ┌───────▼───────┐   ┌───────▼───────┐
   │  Routing    │   │  Campus/Geo   │   │  Journeys/    │
   │  Engine     │   │  (seed/POI)   │   │  Profiles/    │
   │  (pure TS)  │   │  loader       │   │  Analytics    │
   └──────┬──────┘   └───────┬───────┘   └───────┬───────┘
          │                   │                   │
          └───────────────────┴───────────────────┘
                              │
                        ┌─────▼─────┐
                        │  Prisma   │
                        │  Client   │
                        └─────┬─────┘
                              │
                        ┌─────▼─────┐
                        │  SQLite   │
                        │  (dev)    │
                        │ PostgreSQL│
                        │  (Neon)   │
                        └───────────┘
```

---

## 4. Module Breakdown

### 4.1 Routing Engine (`src/lib/routing/`)
Pure TypeScript, framework- and DB-free so it can be unit-tested in isolation.

| File | Responsibility |
|------|----------------|
| `graph.ts` | Builds the campus walking graph (`Graph`, `GraphNode`, `GraphEdge`) |
| `dijkstra.ts` / `astar.ts` | Shortest-path algorithms |
| `cost.ts` | Multi-objective cost functions (FASTEST / SHORTEST / EASIEST) |
| `profiles.ts` | Walking mode profiles (RELAXED / NORMAL / HURRY) |
| `router.ts` | Orchestrates route computation across objectives |
| `directions.ts` | Turn-by-turn instructions (`Maneuver`, `DirectionStep`) |
| `share-url.ts` | Encodes routes into shareable URLs |
| `buddy.ts`, `calories.ts` | Buddy matching, calorie estimation |
| `types.ts` | Shared domain types (framework-independent) |

**Multi-objective routing:** Computes Fastest, Shortest, Easiest, and one Alternative route simultaneously. Each uses a pluggable cost function.

**Key insight preserved:** The shortest route can be slower than the fastest (e.g., Hostel 3 → AB1: Fastest 606 m / ~8 min vs. Shortest 543 m / ~11 min, because shortest takes a stair shortcut).

### 4.2 Campus Data (`src/lib/campus/`)
| File | Responsibility |
|------|----------------|
| `seed.ts` | Representative IITGN campus GeoJSON seed (buildings, paths, POIs) |
| `config.ts` | Centralized constants (routing, campus bounds, cache, rate limits, map, journey) |
| `loader.ts` | Loads campus data |
| `poi-details.ts` | 21+ campus POI detail cards (hours, amenities, capacity, contact) |
| `badges.ts`, `streak.ts` | Gamification: 12 badges, streaks |
| `events.ts`, `schedule.ts`, `ics.ts` | Campus events + schedule + iCal |
| `indoor-plans.ts`, `tours.ts` | Indoor maps + guided tours |
| `commute.ts` | Commute analytics |

### 4.3 API Routes (`src/app/api/`)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/campus` | GET | Full campus GeoJSON (buildings, paths, POIs) |
| `/api/route-compute` | POST | Multi-objective route computation |
| `/api/locations` | GET | Flat POI list with categories |
| `/api/journeys` | GET/POST/PATCH | Journey CRUD + GPS trace completion |
| `/api/analytics` | GET | Aggregated statistics |
| `/api/profiles` | GET | Walking-speed model per mode |
| `/api/campus-activity` | GET | Live activity / heatmap |
| `/api/announcements` | GET | Active announcements |
| `/api/events` | GET | Campus events |
| `/api/weather` | GET | Current weather (weather-aware routing) |
| `/api/tts` | POST | Text-to-speech |
| `/api/smart-suggest` | POST | Smart class/activity suggestions |
| `/api/campus-activity`, `/api/announcements`, `/api/events` | — | Additional campus endpoints |

**Error handling:** Standardized error responses across all API routes (`invalid_request` / `server_error` shapes).

**Rate limiting:** 100 requests/min per IP (config), with `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers.

### 4.4 State & Data Fetching
- **Zustand** stores (`src/hooks/use-app-store.ts`): app state, map state, planner state
- **TanStack Query**: server-state caching with route/graph cache TTLs (5 min graph, 2 min route)
- **Voice navigation** (`use-voice-navigation.ts`): TTS-driven walking instructions

### 4.5 Database (Prisma Schema)
- SQLite for local development
- PostgreSQL (Neon) for production
- Provider must be a literal (`postgresql` / `sqlite`) — `env()` in provider is invalid in Prisma
- Core models: journeys, walking profiles, GPS traces, activity

### 4.6 Internationalization
`next-intl` with three locales: English, Hindi, Gujarati (`src/lib/i18n/`).

### 4.7 Maps
- MapLibre GL 6 with a self-hosted campus style (`/map/style.json`)
- No proprietary map tiles — campus drawn from internal GeoJSON
- Default zoom 15, bounds 12–19

---

## 5. Build & Deploy

- **Build:** `bun run build` → `npx prisma generate --no-engine && next build` + copy static/public into standalone
- **Start:** `NODE_ENV=production bun .next/standalone/server.js`
- **Output:** Next.js standalone (for serverless/container deployment)
- **Vercel:** `regions: ["sin1"]` (free plan rejects multi-region); `DATABASE_URL` set in dashboard (not inherited from `.env.local`)
- **Open item:** Add `db:push`/`db:deploy` scripts + Prisma `postinstall` generate so Vercel builds apply schema automatically

---

## 6. Known Constraints & Gotchas (documented)

- Prisma CLI does **not** read `.env.local`; must `set -a && . ./.env.local && set +a` before Prisma commands
- `provider = env(...)` is invalid in Prisma datasource; provider must be a literal
- Background dev/prod server processes are reaped between exec calls — tests needing a server must start + curl + kill in one command
- `neon.ts` accepts only a `branch` policy (no `postgres` service block in this CLI version)
- Neon DB password was once exposed in chat — rotated at console.neon.tech

---

## 7. Technological Advancements Relevant to IITGN Walk

Reviewed as part of the 2026-10-22 morning checkup. Web search was unavailable (provider errors), so this list is drawn from internal knowledge of the stack's evolution through late 2025 / early 2026.

| Area | Advancement | Relevance to IITGN Walk | Action |
|------|-------------|------------------------|--------|
| **Database / Geospatial** | PostGIS (PostgreSQL spatial extension) | The Prisma schema stores `lng`/`lat` as `Float`. PostGIS enables `ST_DWithin`, `ST_Distance`, nearest-neighbor queries, and geospatial indexing — directly useful for "nearby POIs", "POIs along route", and route-snapping to GPS traces. | Evaluate adding PostGIS to Neon prod; keep `Float` fallback for SQLite dev. |
| **Routing engine** | Contraction Hierarchies (CH) / H3 spatial indexing | Current Dijkstra/A* is fine for campus scale (~hundreds of nodes). CH gives near-instant queries on larger road networks; H3 enables hexbin heatmaps for campus activity. | Keep Dijkstra/A* for now; note CH as scale-up option. |
| **Offline / PWA** | Service Worker + IndexedDB / Cache Storage | App is already PWA-installable. Precaching campus GeoJSON + routing graph enables fully offline route computation. | Add service-worker precache for `/api/campus` + graph; IndexedDB cache for computed routes. |
| **Maps / Vector tiles** | MVT (Mapbox Vector Tiles) + client-side vector tile rendering | Current map is self-hosted GeoJSON via MapLibre GL 6. Vector tiles reduce payload for large campuses and enable smooth zoom/tilt. | Evaluate MVT tiling if campus GeoJSON grows beyond ~100 KB. |
| **Real-time** | WebSocket / Server-Sent Events (SSE) | Currently REST-only. Live walker positions, ETA updates, and SOS broadcasts benefit from push. | Add SSE for live activity / journey tracking as a Phase 2 item. |
| **Auth** | NextAuth 5 (Auth.js) / passkeys | Currently next-auth 4 (configured). NextAuth 5 improves session handling and supports passkeys for passwordless login. | Evaluate NextAuth 5 + passkeys if user accounts become required. |
| **Build / Runtime** | Turbopack (Next 16 production), Next.js standalone output | Already on Next.js 16 + standalone output. Turbopack production builds are stabilizing. | Confirm `next build` uses Turbopack where available; keep standalone for serverless. |

**Recommendation:** Adopt PostGIS + service-worker offline cache as the highest-value, lowest-risk advancements. Defer WebSocket/auth changes until user accounts are required.

---

## 8. Design Trends (2026)

| Trend | Relevance | Current State | Suggested Update |
|-------|-----------|---------------|------------------|
| **Glassmorphism / frosted UI** | Panel overlays, map controls | shadcn/ui New York + Tailwind 4 | Add `backdrop-blur` + translucent panels to map/planner UI. |
| **Dark-mode default** | Next-themes already integrated | `next-themes` configured; toggle present | Keep system/default theme; ensure map style has dark variant. |
| **Micro-interactions** | Framer Motion 12 already in use | Animations on transitions, modals | Maintain; add subtle route-drawing polyline animation. |
| **Accessibility-first** | Radix UI primitives already in use | Full Radix/shadcn set | Keep; run axe-core audit on map + planner. |
| **Mobile-first responsive** | PWA installable, touch-friendly | Responsive layout present | Ensure map touch gestures + bottom sheet planner work on small screens. |
| **Offline-capable PWA** | Service worker precaching | PWA manifest present | Add offline route cache + sync-on-reconnect for journeys. |

---

## 9. Maintenance Cadence

This architecture doc should be revisited each morning checkup:
- Confirm dependency versions are current
- Confirm no drift between `src/lib/config.ts` and this doc
- Record any new API routes or modules added
- Re-evaluate the "Technological Advancements" table against new releases

---

*Last refreshed: 2026-10-22 (morning checkup)*
*Source of truth: `src/lib/config.ts`, `src/lib/routing/types.ts`, `package.json`, `docs/API.md`*