# Repository Conventions

## Directory Structure

- `/app` - Next.js App Router pages and layouts
- `/components` - Shared React components (shadcn/ui)
- `/engines` - Core PHOS business logic
  - `/learning`, `/memory`, `/adaptive`, `/analytics`, `/persistence`
- `/lib` - Utility functions
- `/prisma` - Database schema and migrations
- `/scripts` - Infrastructure automation scripts
- `/tests` - Shared testing infrastructure
- `/docs` - Project documentation
- `/backups` - Local SQLite database backups

## Commit Standards

Follow conventional commit styles where possible, but prioritize clarity.

- **Good:** `fix(adaptive): correct priority calculation logic`
- **Bad:** `fix stuff`

## Naming Rules

- Use PascalCase for React components (`Button.tsx`).
- Use camelCase for utility functions and hooks (`useMemory.ts`).
- Use kebab-case for directories and infrastructure scripts (`setup-dev.ps1`).
