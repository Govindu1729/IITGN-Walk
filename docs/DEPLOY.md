# 🚀 Deployment Guide

## Vercel Setup

### Prerequisites
- Vercel account (free tier works)
- GitHub repository connected
- SQLite database migration to PostgreSQL (optional for production)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Link Project
```bash
vercel link
```

### Step 3: Configure Environment Variables
```bash
vercel env add DATABASE_URL production
```

### Step 4: Deploy
```bash
vercel --prod
```

### For GitHub Integration (Recommended)
1. Visit [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure build settings:
   - Build Command: `bun run build`
   - Output Directory: `.next/standalone`
   - Install Command: `bun install`
4. Add environment variables in Vercel dashboard
5. Deploy

---

## Alternative: Netlify

```bash
npm install -g netlify-cli
netlify login
netlify init
```

**Build Settings:**
- Build command: `bun run build`
- Publish directory: `.next/standalone`

---

## Alternative: Railway

```bash
npm install -g railway-cli
railway login
railway init
```

**Config:
- Start command: `node .next/standalone/server.js`
- Add environment variables via Railway dashboard

---

## Local Testing Before Deploy

```bash
# Build
bun run build

# Test production server
bun run start

# Check on localhost:3000
```

---

## Production Checklist

- [ ] All API routes tested
- [ ] Database schema migrated
- [ ] Environment variables set
- [ ] CORS configured for your domain
- [ ] Custom domain added (optional)
- [ ] SSL certificate (automatic with Vercel/Netlify)
- [ ] Analytics configured (optional)
- [ ] Error tracking (optional)

---

## Troubleshooting

### Build Fails
Check dependencies:
```bash
bun lockb
bun install
```

### Database Connection Issues
Use PostgreSQL for production. Update Prisma schema:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Environment Variables Not Working
Verify with:
```bash
vercel env ls
```

---

## Monitoring

- Vercel provides built-in analytics
- Custom monitoring: Add [Sentry](https://sentry.io) or [LogRocket](https://logrocket.com)

---

*Last updated: 2026-10-16*
