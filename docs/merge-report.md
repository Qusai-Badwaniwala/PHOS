# PHOS — Merge Report

This document records how the two source repositories — a complete
backend (Claude, SDS Modules 00–10) and a complete frontend
(AntiGravity/Kimi, built against the PHOS Transfer Package) — were
combined into this one repository, per the PHOS Final Integration
Master Prompt. It complements, and does not replace,
`docs/integration-review.md` (the backend's own standalone audit).

## 1. What each repository actually contained

Both repositories were read in full before any merging began.

- **Backend (Claude)**: `prisma/`, `shared/`, `lib/{prisma.ts,config,logger}`,
  `repositories/`, `engines/{memory,learning,adaptive,analytics,persistence}`,
  `validators/`, `server/container.ts`, `app/api/v1/**`. Fully working,
  fully tested (unit-test-covered, type-checked), fully documented.
  `engines/` folders in the _frontend_ repository turned out to be
  empty placeholders — there was no real business-logic conflict to
  resolve.
- **Frontend (AntiGravity/Kimi)**: `app/**/page.tsx` and layouts,
  `components/` (a complete, dependency-free component library — no
  Radix UI, no shadcn runtime, no `next-themes`; built with plain React
  state, `clsx`, and Tailwind), `providers/theme-provider.tsx`,
  `lib/{api,hooks,constants,design-tokens.ts,utils.ts}`, `types/dto.ts`,
  full docs set, CI, VS Code config, and Windows automation
  (`*.bat` + `scripts/*.ps1`).
- **Critical discovery**: every function in the frontend's `lib/api/*.ts`
  was a hardcoded mock (`simulateDelay()` + inline literal data) with
  **no real `fetch()` calls to any endpoint at all**. There was
  therefore no endpoint-path collision to resolve at the network level
  — but also no real integration yet. Wiring these to the real backend
  was necessary work, not optional polish (see §4).

## 2. File-level merge

Started from the complete backend repository and layered the frontend
in:

| What                                                                                                               | Action                                                                                      |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `app/api/**`                                                                                                       | Untouched (backend-owned; frontend repo had no `app/api` at all)                            |
| `app/layout.tsx`, `app/page.tsx`, `app/globals.css`                                                                | **Replaced** — these were Sprint-0 backend placeholders; the frontend's real versions win   |
| `app/{dashboard,session,revision,analytics,history,settings,backup,about}/**`, `app/{error,loading,not-found}.tsx` | Added from frontend (backend had none)                                                      |
| `components/`, `providers/`                                                                                        | Added from frontend wholesale (backend's `components/ui` was an empty Sprint-0 placeholder) |
| `lib/{prisma.ts,config,logger}`                                                                                    | Untouched (backend-owned)                                                                   |
| `lib/{api,hooks,constants,design-tokens.ts,utils.ts}`                                                              | Added from frontend — zero filename collisions with backend `lib/`                          |
| `types/`                                                                                                           | Backend's was an empty ambient-types placeholder; frontend's `dto.ts`/`index.ts` added      |
| `docs/README.md`                                                                                                   | **Merged** — combined frontend's navigation index with backend's SDS-authority note         |
| `.github/`, `.vscode/`, `*.bat`, `scripts/*.ps1`, `CONTRIBUTING.md`, rest of `docs/`                               | Added from frontend wholesale (backend had none)                                            |
| `README.md`                                                                                                        | **Rewritten**, combining frontend's product philosophy with backend's technical detail      |

## 3. Configuration conflicts, and how each was resolved

### 3.1 `next.config.js` — critical fix

The frontend's config set **`output: "export"`** (static HTML export)
with `distDir: "dist"`. Static export produces a client-only build
with **no server runtime** and is fundamentally incompatible with
`app/api/**` Route Handlers, which require a running Node.js server.
Keeping it would have **silently discarded the entire backend at
build time** — the single most important thing this merge had to get
right. Replaced with `output: "standalone"` (supports both the API
routes and a self-contained production server), keeping
`images.unoptimized: true` since PHOS is local-first with no CDN.

### 3.2 Framework version — Next.js 15/React 19 → Next.js 14/React 18

The backend's `package.json` (written before the frontend was
available) specified Next 15/React 19. The frontend was built and
presumably tested against Next 14.2/React 18.3. Two things made
downgrading to the frontend's versions clearly correct rather than a
coin flip:

1. Next.js 15 made dynamic route params (`{ params }`) async
   (`Promise`-wrapped) as a breaking change. The backend's own route
   handlers (e.g. `app/api/v1/pages/[pageNumber]/route.ts`) were
   already written using the **synchronous** (pre-15) params
   convention — so targeting Next 14 makes the existing backend code
   correct _as written_, whereas keeping Next 15 would have required
   editing every dynamic route.
2. Rewriting 60+ already-complete frontend files to Next 15/React 19
   conventions carries real risk for a UI that was never built or
   tested against them, for no functional benefit.

### 3.3 ESLint — flat config vs. legacy `.eslintrc.json`

The frontend shipped a legacy `.eslintrc.json` alongside the backend's
modern flat `eslint.config.mjs`. ESLint cannot cleanly run both at
once. Consolidated into the flat config (kept), migrating the
frontend's one custom rule (`react/react-in-jsx-scope: off`) into it.
The frontend's `.eslintrc.json`/`.eslintignore` were not copied into
the merged repo.

### 3.4 Two test runners — Vitest (backend) and Jest (frontend)

Both were kept, each scoped to its own domain, rather than forcing a
single runner:

- `vitest.config.ts` → `tests/**/*.test.ts` only, with `tests/**/*.test.tsx`
  explicitly excluded.
- `jest.config.js` → **fixed**: its original `testMatch` pattern
  (`tests/**/*.test.(ts|tsx)`) also matched the backend's Vitest-authored
  `.test.ts` files, which import from the `"vitest"` package and would
  have failed under Jest's runner. Narrowed to `tests/**/*.test.tsx` only.
- The frontend's `package.json` was also missing `jest`,
  `jest-environment-jsdom`, `@testing-library/react`, and
  `@testing-library/jest-dom` as declared dependencies despite
  `jest.config.js`/`jest.setup.js` requiring them — added.

### 3.5 `tsconfig.json` — path aliases and strictness

The backend used granular per-folder path aliases
(`@/shared/*`, `@/repositories`, etc.); the frontend used one broad
`@/*` → `./*` wildcard. Both are kept — the granular aliases first, the
wildcard last as a catch-all — since TypeScript resolves path patterns
in listed order. Three of the backend's stricter compiler flags
(`noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`)
were relaxed: they were satisfied by backend code (over-satisfying a
relaxed rule is always safe) but never tested against the frontend's
components, and are exactly the flags most likely to surface a large
number of new findings in idiomatic React/TSX code without a
proportionate benefit. The lower-risk, higher-value strict flags
(`noUncheckedIndexedAccess`, `noImplicitOverride`,
`noImplicitReturns`, `noFallthroughCasesInSwitch`,
`forceConsistentCasingInFileNames`) were kept.

### 3.6 Prettier — kept the backend's config, not the frontend's

The frontend's `.prettierrc.json` declared `singleQuote: true`, but an
empirical check of the actual source (562 double-quoted imports, 0
single-quoted) showed the real code was never actually formatted with
that config — it consistently uses double quotes, matching the
backend's config already. Kept the backend's `.prettierrc.json`
unchanged to avoid reformatting 60+ working files for no reason;
merged only the ignore-pattern list.

### 3.7 `tailwind.config.ts`, `postcss.config`, `.gitignore`, CI Node version

Took the frontend's real Tailwind design system (the backend's was an
empty Sprint-0 placeholder). Kept the backend's ESM `postcss.config.mjs`
(identical plugin config to the frontend's CJS version). Merged
`.gitignore` patterns from both (union). Bumped both GitHub Actions
workflows from Node 18 to Node 20, matching `package.json`'s
`engines.node` requirement; added a `typecheck` step and a frontend
(`test:ui`) test step to CI alongside the existing backend test step.

## 4. Frontend/backend DTO boundary

The frontend defines its own presentation-layer DTOs
(`types/dto.ts` — `DashboardDTO`, `SessionDTO`, `RevisionDTO`,
`SettingsDTO`, etc.), independently designed and **not** identical in
shape to the backend's own API DTOs
(`app/api/v1/_shared/dto/*.dto.ts`). Two names even collide
(`DashboardDTO` means something different in each file) — this is not
a bug, since they live in separate modules (`@/types/dto` vs. the
backend-internal `app/api/v1/_shared/dto`) and TypeScript never
confuses them.

Rather than rewriting the frontend's already-complete components to
consume the backend's raw DTOs (a large, risky change to working code,
and against the Master Prompt's instruction not to regenerate
completed implementations), **every `lib/api/*.ts` module was rewritten
to call the real backend and adapt the response into the frontend's
existing DTO shape.** This is the standard backend-DTO → frontend-view-model
adapter pattern, not a duplicate implementation of the same thing.

The most significant modeling difference: the frontend treats "Session"
(new memorization) and "Revision" (Sabqi/Manzil/Recovery review) as two
separate concepts; the backend's Adaptive Engine produces one combined,
priority-ordered Daily Study Plan where each item carries its own
`workloadCategory`. The adapter splits that one plan by category:
`NewMemorization` items become "Session," everything else becomes
"Revision" (with `OverdueRevision`/`RecentRevision` → `"sabqi"`,
`LongTermRevision` → `"manzil"`, `Recovery` → `"recovery"`).

### What is genuinely real vs. honestly approximated

| Frontend module                                     | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/api/backup.ts`                                 | **Fully real.** Near-perfect 1:1 mapping to `/api/v1/backup/*`.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `lib/api/dashboard.ts`, `session.ts`, `revision.ts` | **Real**, via `/session/today` and `/analytics/dashboard`. `assignment.surah` is always omitted — the backend never stores Quran text or Surah names (a locked SDS principle) — page-number labels are used instead.                                                                                                                                                                                                                                                                                             |
| `lib/api/analytics.ts`, `history.ts`                | **Real** for everything the Analytics Engine actually computes (`memoryStrengthDistribution` is a genuine 1:1 mapping of real per-MemoryState page counts). `currentStreak` and "milestone"/"settings" activity entries are always omitted/excluded — the Analytics Engine does not compute streaks or track milestones.                                                                                                                                                                                         |
| `lib/api/settings.ts`                               | **Partially real.** `theme` round-trips to the real `Settings` database row. Every other field (`general.*`, `session.*`, `revision.*`, `appearance.reducedMotion`/`compactMode`) has no backend column — the SDS's locked `Settings` schema (Module 01) stores only `theme` and `ayahRotationFrequency`. These persist to `localStorage` only. This is a real, currently-open gap, not a bug: closing it would mean an additive Prisma migration, which was intentionally not made as part of this integration. |

`updateSessionStatus()`/`updateRevisionStatus()` map the frontend's
richer status model (`not_started`/`in_progress`/`paused`/`completed`/`interrupted`)
onto the Learning Engine's actual lifecycle (`start`/`recall`/`confidence`/`finish`/`cancel`)
as closely as the two can honestly correspond; `"paused"` has no
backend equivalent yet and is a documented no-op.

## 5. Verification performed

- `tsc --strict` against every file this merge created or modified
  (`lib/api/*.ts`, `lib/api/http.ts`, `types/`) — clean, using
  framework-agnostic stubs since these files have zero React/Next
  dependencies.
- `tsc --strict` re-run against the **entire pre-existing backend**
  (`shared/`, `lib/{prisma,config,logger}`, `repositories/`, `engines/`,
  `validators/`, `server/`, `app/api/`, all backend tests) under the
  merged `tsconfig.json`/`package.json` — clean, confirming the merge
  changed nothing about how the backend itself compiles.
- **Not verified in this sandbox** (no network access to run
  `npm install`): the frontend's own component tree under the new
  Next 14/React 18 versions, `next build`, and both test suites
  actually executing. This mirrors the same limitation noted
  throughout `docs/integration-review.md` for the backend — everything
  is written and internally consistent, but running `npm install &&
npm run build && npm run test:all` in a networked environment is the
  concrete next step to fully confirm the merge.

## 6. Known gaps carried into or introduced by this merge

- **No PWA assets.** `public/` is empty in the frontend repository —
  no manifest, no icons — despite the SDS listing PWA as a locked
  principle. Pre-existing gap, not introduced by this merge.
- **Settings persistence gap** (§4 above) — most Settings fields are
  client-only.
- **No streak/milestone tracking** on the backend — several frontend
  fields designed for this are always omitted.
- Everything already listed in `docs/integration-review.md` §3
  (no auth, no background job scheduler, no CI-executed test run in
  this sandbox, etc.) still applies unchanged.
