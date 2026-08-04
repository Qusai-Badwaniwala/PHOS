# Infrastructure Architecture

This document describes the philosophy and organization of the infrastructure surrounding the PHOS application.

## Engineering Boundaries

- **Claude (Backend/Logic):** Responsible for Prisma models, SQLite integration, API routes, and the Five Engines (Learning, Memory, Adaptive, Analytics, Persistence).
- **Kimi / Future UI Engineer:** Responsible for React components, Tailwind styling, and shadcn/ui integration.
- **AntiGravity (Infrastructure):** Responsible for bootstrap scripts, CI/CD, documentation, testing infrastructure, and repository management.

## Automation Principles

- Automation scripts should be deterministic and idempotent.
- Scripts must not perform silent destructive actions (e.g., deleting a database without warning).
- Errors should be descriptive and provide actionable guidance.

## Tooling

- **Linting:** ESLint (Next.js Core Web Vitals)
- **Formatting:** Prettier
- **Editor Config:** `.editorconfig` enforcing LF line endings and 2-space indentation.
