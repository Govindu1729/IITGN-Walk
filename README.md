# IITGN Walk — Campus Navigation Intelligence

A **campus-specific** smart walking-route & travel-time platform for **IIT Gandhinagar (IITGN)**.

Unlike generic map apps, the routing graph is built from IITGN's internal roads, paths, and
decision nodes — *not* third-party street tiles — and it learns from student-generated walking
data to refine travel-time predictions over time.

> **What's the quickest/easiest walking route from where I am to where I'm going, and how long
> will it take based on how I walk?**

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Multi-objective routing** | Computes Fastest, Shortest, Easiest, and one Alternative route simultaneously |
| **Mode-aware ETAs** | Relaxed / Normal / Hurry profiles with tunable walking speeds |
| **Continuous learning** | Campus walking speed per mode recomputed from actual journey data |
| **Self-contained map** | Campus drawn from our own GeoJSON dataset — no proprietary map tiles |
| **Emergency SOS** | Floating SOS button with nearest security post contact |
| **Gamification** | 12 badges + 6 weekly walking challenges with leaderboard |
| **POI Detail Cards** | 21+ campus locations with hours, amenities, capacity, contact info |
| **i18n** | English, Hindi, Gujarati |
| **PWA** | Installable offline-capable web app |

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Govindu1729/IITGN-Walk.git
cd IITGN-Walk

# 2. Install dependencies
bun install

# 3. Set up environment
cp .env.example .env
# Add DATABASE_URL to .env (see docs/DEPLOY.md for production setup)

# 4. Set up the database
bun run db:generate
bun run db:push

# 5. Start the dev server
bun run dev
# → http://localhost:3000
```

---

## 📁 Project Structure

```
iitgn-walk/
├── prisma/schema.prisma          # Database schema (SQLite/PostgreSQL)
├── vercel.json                    # Vercel deployment configuration
├── src/
│   ├── app/api/                   # API routes (/api/campus, /api/route-compute, etc.)
│   ├── components/                # React components (map, planner, navigation, etc.)
│   ├── lib/campus/seed.ts         # IITGN campus seed dataset (representative)
│   ├── lib/routing/               # Dijkstra, A*, cost functions
│   └── lib/geo/                   # Geometry utilities (haversine, etc.)
├── docs/
│   ├── API.md                     # Full API reference & endpoint documentation
│   ├── DEPLOY.md                  # Deployment guide (Vercel, Netlify, Railway)
│   └── MIGRATION.md               # SQLite → PostgreSQL migration guide
├── CONTRIBUTING.md                # Contributor onboarding guide
├── COMMUNITY.md                   # Community feature guidelines
└── README.md                      # This file
```

---

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on `http://localhost:3000` |
| `bun run build` | Build production bundle (standalone output) |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Regenerate Prisma client |

---

## 🔧 Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `DB_PROVIDER` | ✅ | `postgresql` (or `sqlite` for local dev) |

Copy `.env.example` to `.env` and fill in your values. `.env` is gitignored — never commit real credentials.

---

## 📚 Extended Documentation

| Document | Location | Contents |
|----------|----------|----------|
| **API Reference** | `docs/API.md` | All API endpoints, request/response schemas |
| **Deployment** | `docs/DEPLOY.md` | Vercel, Netlify, Railway setup guides |
| **Migration** | `docs/MIGRATION.md` | SQLite → PostgreSQL migration steps |
| **Contributing** | `CONTRIBUTING.md` | Contributor onboarding & code standards |
| **Community** | `COMMUNITY.md` | Feature submission & project governance |

---

## 📖 Routing Overview

The routing engine uses **Dijkstra** and **A\*** with multi-objective cost functions:

| Objective | Cost Metric | Best For |
|-----------|-------------|----------|
| **FASTEST** | Predicted travel time | Quickest route |
| **SHORTEST** | Geometric distance | Fewest metres |
| **EASIEST** | Time + difficulty surcharge | Accessibility, no stairs |

After each completed journey, campus-level walking speeds are recomputed:
`Σdistance / Σtime`, blended with defaults until ≥30 samples exist.

---

## ⚠️ Important Notes

- **Seed data** (`src/lib/campus/seed.ts`) is a manually-entered representative reconstruction of the IITGN campus. Replace with verified GPS survey data before production use.
- **Database**: SQLite for local development; PostgreSQL (Neon) recommended for production. See `docs/MIGRATION.md`.
- **PII**: Only anonymised GPS coordinates, timestamps, and walking mode are stored.

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for:
- Development workflow & commit conventions
- Coding standards & TypeScript requirements
- Pull request & issue templates

---

## 📄 License

Private project. All rights reserved.
