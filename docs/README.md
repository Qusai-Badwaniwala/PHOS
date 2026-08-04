# PHOS Documentation Index

Welcome to the PHOS Developer Documentation. This directory contains all
engineering and infrastructure documentation required to develop,
maintain, and contribute to PHOS.

## Table of Contents

- [Root Cause Investigation](root-cause-investigation.md) — production
  stabilization pass: two real bugs traced to their true root cause,
  fixed, and a full production audit.
- [Integration Review](integration-review.md) — the final backend
  build audit (dependency-graph check, resolved conflicts, and every
  documented deviation across the whole backend implementation).
- [Developer Onboarding](onboarding.md) — start here if you are new to
  the repository.
- [Development Workflow](development.md) — guidelines for working with
  the toolchain and tests.
- [Infrastructure Architecture](infrastructure.md) — details on project
  structure, automation, and CI/CD.
- [Repository Conventions](conventions.md) — coding standards, file
  naming, and directory organization.
- [Automation & Tooling](automation.md) — guide to the provided
  PowerShell scripts and batch utilities.
- [Project Maintenance](maintenance.md) — backup, restore, and
  diagnostic procedures.
- [Repository Health Report](health_report.md) — status of the
  repository infrastructure.

## Source of truth

The PHOS Software Development Specification (SDS) and the PHOS
Transfer Package are the authoritative sources for architecture, UX
philosophy, engine responsibilities, and folder ownership. Nothing in
this `docs/` directory may contradict either. If a conflict is ever
found between something written here and either of those documents,
the SDS/Transfer Package wins and this folder must be corrected.

See also the root [`README.md`](../README.md) for the project overview,
current build status, and getting-started instructions.
