# PHOS — Integration Review (MODULE 10)

This is the final module in the SDS's implementation roadmap (00–10).
Unlike Modules 01–09, this module builds nothing new — it audits
everything built in Modules 00–09 against the SDS as a whole, fixes
what the audit finds, and consolidates every previously-flagged
deviation into one place.

There is no dedicated "Integration Review" Part in the SDS describing
exact deliverables for this module — only its name in the Part 3
roadmap. This review was therefore built as: (1) a full-project
dependency-graph audit, (2) a review pass against Parts 18, 20–26
(Integration Contracts, Security, Background Jobs, Testing, Performance,
Deployment, Coding Standards) which hadn't been individually built out
as their own modules, and (3) a consolidated list of every deviation
flagged module-by-module so far.

---

## 1. Dependency-graph audit

A full audit was run across all 139 production TypeScript files (347
internal import edges) built through Modules 01–09.

**Findings:**

- **Zero circular imports**, verified with a dependency-graph script
  walking every `import` statement in `engines/`, `repositories/`,
  `shared/`, `lib/`, `validators/`, `server/`, and `app/api/`.
- **`shared/types/`** has zero external imports (fully self-contained).
- **`shared/errors/`** imports only from `shared/types/`.
- **`shared/utils/`** has zero imports (a pure leaf).
- **No engine imports `@prisma/client` directly**, except the one
  documented exception already called out in `PersistenceEngine.ts`
  (`prisma.$disconnect()` during restore, to release the file handle
  before Prisma reopens the just-restored SQLite file — no domain data
  is read or written through that call).
- **No repository imports from `engines/`** (correct direction).
- **No engine imports the top-level `validators/`** (the API-facing
  Validation Layer) — each engine that validates its own inputs does
  so with its own local, domain-specific validator, which is correct;
  the shared `validators/` package is API-layer-only.

**One real bug found and fixed during this review:**

`app/api/v1/session/recall/route.ts` was calling
`container.pageRepository.findById()` directly to read a page's
current memory state — bypassing the Engine layer for data the Memory
Engine already exposes through `getCurrentMemoryProfile()`. This was
**not** a case like `/pages*` or `/settings*` (where no engine owns the
read at all); an engine method existed and should have been used. It
has been fixed to call `container.memoryEngine.getCurrentMemoryProfile()`
instead.

**Confirmed, unchanged exceptions** (both already documented at their
point of use, both re-confirmed as the _only_ two remaining places the
API layer touches a repository directly):

1. `/settings*` routes → `SettingsRepository` (Settings has no owning
   engine among the SDS's closed 5-engine roster, and no business
   logic to protect).
2. `/pages*` routes → `PageRepository` (page listing/lookup has no
   owning engine either — Memory Engine's read returns a narrower
   shape, and Adaptive Engine's methods take pages as input rather
   than fetching them).

## 2. Review against Parts 18, 20–26

These Parts describe cross-cutting architecture (Part 18), and five
additional specifications (Parts 20–26) that are not separate numbered
modules in the SDS's own 00–10 roadmap. Building full standalone
subsystems for all of them (a background job scheduler, an
authentication system, a CI pipeline, a load-testing harness) would be
substantial, additional, unrequested scope well beyond "review the
integration of what was built." Each was reviewed for **consistency**
against what already exists; genuine gaps are listed below rather than
silently left unmentioned.

- **Part 18 (Integration Contracts)**: cross-engine dependency
  directions, DTO boundaries, and error-translation flow were checked
  against this Part's rules during the audit above — no violations
  found.
- **Part 20 (Security Contracts)**: input sanitization, parameterized
  queries (Prisma-only, confirmed — no raw SQL anywhere), path
  handling in the Persistence Engine (backup/restore file paths are
  built from DB-stored filenames or config, never from raw
  user-supplied paths through any currently-built endpoint), and
  "no stack traces in public responses" (confirmed —
  `BaseException.toStandardErrorModel()` excludes `.stack`) are all in
  place. Authentication/authorization interfaces are **not** built —
  see the consolidated "No Authentication" note below. Rate limiting is
  **not** built; for a single-user, local-only, non-internet-facing
  process this is a reasonable simplification, but it's a real gap if
  PHOS is ever exposed over a network.
- **Part 21 (Background Jobs & Scheduling)**: **not built.** This
  describes a full job-scheduler subsystem (queue, retry, cancellation,
  recurring schedules) that was never one of the 00–10 roadmap modules.
  All of Part 21's example use cases (backup creation, DB verification)
  already work synchronously through the Persistence Engine built in
  Module 04. A true scheduler is a legitimate, consciously deferred gap
  for a future module, not something quietly skipped.
- **Part 22 (Testing Specification)**: unit tests exist for every
  Engine, the Validation Layer, and DTO validators (all written and
  type-checked, but — as noted in every module since 05 — **not
  executed**, since this sandbox has no network access to install
  Vitest). **Not present:** repository tests against a real SQLite test
  database, cross-layer integration tests, end-to-end workflow tests,
  and a CI pipeline definition. These require an environment with
  network access to run `npm install` and are the clearest concrete
  next step for whoever picks this project up outside this sandbox.
- **Part 24 (Performance Requirements)**: N+1 avoidance, index usage,
  and "reuse shared aggregations" were addressed directly in Modules
  07–08 with inline justification. No performance instrumentation
  (request/engine/query duration metrics) exists beyond the Logging
  System's timer support from Module 03 — building dashboards or metric
  export was out of scope for a local single-user app.
- **Part 25 (Production Deployment)**: startup/shutdown orchestration,
  directory structure, and environment-variable-driven configuration
  were already established in Sprint 0 and extended through Module 04.
  Formal startup-sequence code (validate config → init logging → init
  Prisma → migrate → init repositories → init engines → accept
  requests, all as one explicit orchestrated function) does not exist
  as a single file — Next.js's own request lifecycle currently plays
  that role implicitly via the composition root's module-load-time
  initialization (`server/container.ts`).
- **Part 26 (Coding Standards)**: naming conventions, dependency
  injection, comments-explain-why, and "no magic numbers" were followed
  throughout — every numeric/string constant with business meaning is a
  named export in each module's own `constants/` folder.

## 3. Every deviation, consolidated in one place

| #   | Where     | Deviation                                                                                        | Why                                                                                                     |
| --- | --------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 1   | Sprint 0  | No Docker configuration                                                                          | SDS locks "No Docker Requirement"                                                                       |
| 2   | Module 01 | Backup version fields (schema/format version) live in a `.manifest.json` sidecar, not the DB row | Part 13 wants fields Part 8's already-completed schema doesn't have                                     |
| 3   | Module 04 | `importData()` applies data sequentially, not atomically                                         | Part 9 describes a transaction policy but defines no transaction-wrapping repository method             |
| 4   | Module 04 | Re-importing the same export duplicates history                                                  | No import-deduplication rule is specified                                                               |
| 5   | Module 05 | Memory-update formula and thresholds are original, documented calibration                        | Part 10 gives invariants, not a formula                                                                 |
| 6   | Module 06 | `LearningEngine` holds session state in memory across calls                                      | Deliberate fit for single-user, standalone-process deployment; resolved by Module 09's composition root |
| 7   | Module 07 | Priority-score formula, "due" = page's own stability (not calendar-based)                        | Part 11 gives invariants, not a formula                                                                 |
| 8   | Module 08 | Memory Health / Retention Quality / Trend formulas are original                                  | Part 14 says "may consider," not a formula                                                              |
| 9   | Module 09 | **No authentication/authorization code**                                                         | SDS's own locked principle "No Authentication" overrides Part 15/20's checklist items                   |
| 10  | Module 09 | `/settings*` and `/pages*` access repositories directly                                          | No owning Engine exists for either in the closed 5-engine roster                                        |
| 11  | Module 09 | Backup creation is synchronous, not progress-streamed                                            | Local SQLite backups complete quickly; true async progress reporting is deferred                        |
| 12  | Module 10 | Background Job System (Part 21) not built                                                        | Never one of the 00–10 roadmap modules; all example use cases already work synchronously                |
| 13  | Module 10 | Rate limiting, auth interfaces, CI pipeline, load/E2E tests, real-DB repository tests not built  | Consistent with the "No Authentication," single-user, sandboxed-environment constraints above           |

## 4. Final status

Every module in the SDS's 00–10 roadmap is now complete. The codebase
type-checks cleanly as one project (`tsc --strict`, zero errors) across
all 139 production files and every test file. No placeholders, `TODO`s,
or stub implementations remain anywhere outside the two consciously
deferred subsystems in row 12–13 above, both of which were never part
of the numbered module roadmap this project was built against.
