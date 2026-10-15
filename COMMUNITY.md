# 🤝 IITGN Walk — Community Development Guide

This guide helps contributors integrate features, submit code, and sync with the project.

---

## 📦 Local Setup

### Prerequisites
```bash
# Install Bun (required)
curl -fsSL https://bun.sh/install | bash

# Clone the repository
git clone https://github.com/Govindu1729/IITGN-Walk.git
cd IITGN-Walk

# Install dependencies
bun install

# Setup environment
cp .env.example .env
bun run db:push
bun run dev
```

### Code Sync Workflow
```bash
# Before starting work
git pull origin main

# After making changes
bun run lint
bun run build

# Commit with message
git add .
git commit -m "feat: add feature description"

# Sync with GitHub
git push origin main
```

---

## 🔧 Development Guidelines

### 1. Project Structure
```
src/
├── app/              # Next.js app router
├── components/       # React components
├── lib/
│   ├── campus/       # Seed data, POI details
│   ├── routing/      # Dijkstra, A*, cost functions
│   └── geo/          # Geometry utilities
└── api/              # API routes
```

### 2. Adding New Features

**Step 1: Define the Feature**
```markdown
## Feature: <name>

**What**: Brief description  
**Why**: User benefit  
**Files**: Affected paths  
**API**: New endpoints (if any)
```

**Step 2: Implement**
- Create files under correct `src/` directory
- Add TypeScript types to `src/lib/routing/types.ts`
- Write API route if needed
- Add component if UI required

**Step 3: Test**
```bash
bun run lint
bun run build
bun run db:push  # Verify DB changes
```

**Step 4: Document**
- Update `README.md` if API changed
- Add to `COMMUNITY.md` features section

---

## 📝 Documentation Sync

### Obsidian Integration

Daily dev logs go to:
```
~/Documents/Obsidian Vault/Daily Notes/
```

### Template: Daily Entry
```markdown
# 2026-10-16 - Dev Log

## Work Done
- [Task X] Feature implementation
- [Task Y] Bug fix

## Issues Faced
- Problem description

## Next Steps
- Priority items

## Notes
- Important decisions
```

### Sync Checklist
- [ ] Update `worklog.md` after major changes
- [ ] Commit all code changes
- [ ] Push to GitHub
- [ ] Create daily note in Obsidian

---

## 🌟 Feature Submission Template

```markdown
## Feature Proposal: <Name>

### Summary
Brief 2-3 sentence description.

### User Stories
- As a user, I can...
- This helps me...

### Implementation Plan
1. Backend: ...
2. Frontend: ...
3. Testing: ...

### Dependencies
- Existing APIs/components needed

### Timeline
Estimated effort: <X hours>
```

---

## 🔒 Security & Privacy

- **Never** commit `.env` files with secrets
- **Always** use `.env.example` for documentation
- **Keep** `.env` gitignored (already configured)

### API Keys
If using external APIs:
1. Store in GitHub Secrets
2. Access via `process.env`
3. Document in `.env.example`

---

## 📬 Support

- **Issues**: GitHub Issues tab
- **Discussions**: GitHub Discussions
- **Contributors**: See `CONTRIBUTING.md`

---

## 🚀 Community Features Checklist

- [ ] GitHub Actions CI/CD pipeline
- [ ] Code of Conduct
- [ ] Issue templates
- [ ] PR templates
- [ ] Community forum (Discord/GitHub Discussions)
- [ ] Feature request system
- [ ] Documentation site (Vercel/Netlify)
- [ ] Demo environment

---

*Last updated: 2026-10-16*
