# Project Maintenance

This document outlines standard maintenance procedures for PHOS.

## Backups

_(Automated backup scripts will be delivered in Sprint 1)._
All local backups of the SQLite database will reside in the `/backups` directory.

## Restoration

_(Automated restoration scripts will be delivered in Sprint 1)._

## Diagnostics

If the environment fails:

1. Verify Node.js version.
2. Check that `.env` files are correct.
3. Validate Prisma schema using `npx prisma validate`.
