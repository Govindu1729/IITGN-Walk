# 🔄 Database Migration Guide

## From SQLite to PostgreSQL

### Why Migrate?
- Better concurrency
- Full geospatial support (PostGIS)
- Production-grade reliability
- Scalability for multiple users

### Migration Steps

#### 1. Install PostgreSQL
**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt install postgresql postgresql-contrib
```

#### 2. Create Production Database
```bash
# Create database
createdb iitgn_walk_prod

# Create user (if needed)
psql -c "CREATE USER iitgn_user WITH PASSWORD 'your_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE iitgn_walk_prod TO iitgn_user;"
```

#### 3. Update Environment Variables
```bash
# .env (development)
DATABASE_URL="file:../db/custom.db"

# .env.prod (production)
DATABASE_URL="postgresql://iitgn_user:password@localhost:5432/iitgn_walk_prod"
DB_PROVIDER="postgresql"
```

#### 4. Migrate Schema
```bash
# Generate Prisma client
bunx prisma generate

# Run migrations (creates tables)
bunx prisma migrate deploy
```

#### 5. Migrate Data (if needed)
```bash
# Export from SQLite
sqlite3 db/custom.db .dump > backup.sql

# Import to PostgreSQL
psql iitgn_walk_prod < backup.sql
```

### PostGIS Setup (Optional for Enhanced Geospatial)

#### 1. Install PostGIS Extension
```bash
psql iitgn_walk_prod -c "CREATE EXTENSION postgis;"
```

#### 2. Update Schema (For Future Versions)
```prisma
lng    Float
lat    Float
// Later: replace with geometry(Point, 4326)
```

---

## Heroku / Render Deployment

### Heroku Setup
```bash
# Install Heroku CLI
brew install heroku

# Login
heroku login

# Create app
heroku create iitgn-walk

# Add database
heroku addons:create heroku-postgresql:hobby-dev

# Push code
git push heroku main
```

### Render Setup
1. Connect GitHub repository
2. New Web Service
3. Set build command: `bun run build`
4. Set start command: `node .next/standalone/server.js`
5. Add PostgreSQL as database
6. Deploy

---

## Testing Before Deploy

```bash
# Create test database
createdb iitgn_walk_test

# Set test env
export DATABASE_URL="postgresql://user:pass@localhost/iitgn_walk_test"
export DB_PROVIDER="postgresql"

# Generate client
bunx prisma generate

# Run migrations
bunx prisma migrate deploy

# Seed test data (optional)
bun run db:push
```

---

## Troubleshooting

### Error: "provider not found"
Add `DB_PROVIDER` environment variable:
```bash
export DB_PROVIDER="postgresql"
```

### Error: "SSL mode required"
For production hosts (Heroku, Railway, etc.):
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

### Error: "Connection refused"
Check PostgreSQL is running:
```bash
pg_isready
# OR
brew services list
```

---

*Last updated: 2026-10-16*
