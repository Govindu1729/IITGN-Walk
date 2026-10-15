# Contributing to IITGN Walk

Thank you for your interest in contributing! This guide will help you get started.

## 🌟 How to Contribute

### 1. Fork and Clone
```bash
git clone https://github.com/YOUR_USERNAME/IITGN-Walk.git
cd IITGN-Walk
bun install
```

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes
- Follow TypeScript strict mode
- Keep functions small and focused
- Add comments for complex logic

### 4. Test Locally
```bash
bun run lint
bun run build
bun run db:push
bun run dev
```

### 5. Submit a Pull Request
- Link to related issues
- Describe what you changed
- Update documentation if needed

## 📝 Coding Standards

### TypeScript
- Use strict mode (`noImplicitAny: true`)
- Define explicit types for props and API responses
- Avoid `any` unless absolutely necessary

### Naming Conventions
- Components: `PascalCase` (e.g., `RoutePlanner`)
- Files: `kebab-case` (e.g., `route-planner.tsx`)
- Functions/Variables: `camelCase` (e.g., `calculateRoute`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_WALK_SPEED`)

### API Routes
- Use HTTP methods correctly (`GET`, `POST`, `PATCH`)
- Validate all inputs with Zod
- Return consistent error formats

## 🔧 Development Workflow

### Commit Messages
Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Formatting only
- `refactor:` Code restructuring

### Code Review
- At least one approval required
- CI checks must pass
- Address all review comments

## 🐛 Reporting Issues

Use the GitHub issue templates:
- **Bug Report:** Include steps to reproduce
- **Feature Request:** Describe the use case

## 💬 Questions?

Open a discussion on GitHub or contact the maintainers.

---

*Thank you for making IITGN Walk better!*
