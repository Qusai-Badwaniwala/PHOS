# Development Workflow

This document details the day-to-day workflow for building and testing PHOS.

## Local Development

_(To be populated in Sprint 1 when Next.js is configured and bootstrap scripts are created.)_

## Testing Philosophy

Tests in PHOS are intended to provide confidence without adding excessive complexity.

- **Unit Tests:** Should cover pure functions in the engines.
- **Integration Tests:** Should verify database interactions (Prisma/SQLite) without touching the UI.
- **UI Tests:** Minimal tests ensuring correct rendering.

_(Test framework configuration will be added in Sprint 2)._

## Code Quality Checks

Before committing code, ensure:

1. Formatting is compliant (`npm run format` - _coming soon_)
2. Linting passes (`npm run lint` - _coming soon_)
3. Tests pass (`npm run test` - _coming soon_)
