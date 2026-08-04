# PHOS — start here

**If you are an AI assistant opening this project cold, read this file
first and in full. It is the shortest path to being useful.**

---

## What PHOS is

A Personal Hifz Operating System: a calm, offline-first companion for
memorizing the Quran. It schedules new memorization and revision from
evidence-based memory research, explains every decision it makes, and
stores everything on the user's own device.

It is **not** a Quran reader. It never stores, renders or displays
Quran text or Mushaf images — the user reads from their own physical
Mushaf and PHOS only says which page to open. It has no gamification,
no streaks, no accounts and no social features. These are product
constraints, not oversights; do not "helpfully" add any of them.

Author and product owner: **Qusai**.

---

## Current state — v1.0, shipped

|              |                                                    |
| ------------ | -------------------------------------------------- |
| Live at      | https://qusai-badwaniwala.github.io/PHOS/          |
| Repository   | https://github.com/Qusai-Badwaniwala/PHOS (public) |
| Project root | `phos-handoff/phos-integrated/`                    |
| Deployed     | 2026-08-04                                         |

All nine build phases are complete. The application is deployed,
working, and verified in a browser.

---

## Architecture in one screen

```
app/**/page.tsx, components/, providers/     the screens
        │
lib/api/*                    engine DTOs → presentation DTOs
        │
client/operations/*          validate, call engines, map results
        │
client/container.ts          the composition root
        │
engines/{memory,adaptive,learning,analytics,persistence}
        │
repositories/interfaces → repositories/browser
        │
IndexedDB (via idb)
```

Rules that hold the design together, in order of importance:

1. **Engines own all business logic.** Never put a domain decision in a
   component, a hook, an operation or a repository.
2. **Engines depend on repository _interfaces_**, never on a concrete
   class, and never construct one. The container injects them. This is
   the single reason PHOS could move from SQLite to IndexedDB without
   changing an engine or an engine test.
3. **The Memory Engine is the only writer of `memoryState`.**
4. **RecallEvents are append-only.** Exactly one Settings row exists.
5. **Nothing is claimed in the UI that the build does not do.** The
   guide, onboarding and README are held to the same accuracy standard
   as the code. If a change makes a claim untrue, change the claim.

---

## Working on it

```bash
npm install
npm run dev            # http://localhost:3000
```

Nothing else to set up — no `.env`, no database, no migrations. The 604
pages of the Mushaf are seeded into IndexedDB the first time the app
opens.

### The gate — everything must pass before committing

```bash
npm run format
npm run lint
npm run typecheck
npm run test           # 309 engine + repository tests (Vitest)
npm run test:ui        # 107 component + page + service-worker tests (Jest)
npm run build          # static export into out/
```

### Seeing what actually ships

```bash
npm run build
npm run preview        # serves out/ at http://localhost:3000
```

Use a **different port** to get a clean database — a different origin
means a fresh IndexedDB, which is the quickest way to test a first-run
experience without clearing browser storage.

### Deploying

Push to `main`. That is the whole process.
`.github/workflows/deploy.yml` runs the gate, builds with
`PHOS_BASE_PATH=/PHOS`, and publishes to GitHub Pages. A failing gate
refuses to deploy rather than shipping something broken.

---

## What experience has taught this project

Read `docs/phase-progress.md` for the full record. The short version,
because it will save you from repeating it:

**Tests passing is not evidence that it works.** Nearly every serious
defect in PHOS's history — a return allowance that was a no-op, a
workload warning that was dead code, a 45% recall producing an
_increase_, an unsatisfiable typed confirmation, a number field turning
45 into 545, an onboarding preview that was never on screen, an offline
route that died without its trailing slash — passed every test and
every type check, and was found by a human opening the app.

So: **run it, click it, and look.** Then write the test that would have
caught it, and prove the test fails without the fix.

**Verify a fix by restoring the defect.** Every regression test in this
codebase was confirmed to fail against the original behaviour before
being accepted. A test that has never failed is not yet a test.

---

## Known gaps, stated deliberately

- **Never tested on a real phone.** The PWA install path is verified by
  reading the manifest and the built output, not by installing on iOS
  or Android.
- **No React component tests for presentational components or the
  data-fetching hooks.** `tests/ui/` covers the places where a defect
  costs data or strands the user; the rest is manual.
- **`client/operations/*` has no direct tests.** Covered indirectly —
  engines and validators are tested, adapters are tested with the
  operations mocked.
- **Two `postcss` advisories** reached through `next`. Build-time only,
  processing PHOS's own CSS; nothing ships to the browser. Assessed and
  accepted. The fix is `next@16`, a two-major upgrade not attempted.
- **CI installs with `npm install`, not `npm ci`.** Deliberate — see
  the note in `.github/workflows/ci.yml` for what that trades away and
  why.
- **The scheduling constants are engineering judgement.** Built on
  published memory research, but the specific decay rates and
  thresholds were chosen and sanity-checked, never validated against
  real Hifz outcome data. "Scientifically informed" is the honest
  phrase.

---

## Where the documents are

| File                                                 | What it holds                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `docs/phase-progress.md`                             | The full build record, every phase, every defect and why each decision was made      |
| `docs/phase-9-static-pwa-plan.md`                    | Why and how PHOS moved into the browser                                              |
| `client/operations/README.md`                        | Endpoint-by-endpoint account of what replaced the API routes                         |
| `README.md`                                          | Architecture, scripts, known gaps                                                    |
| `docs/merge-report.md`, `docs/integration-review.md` | History from before the app ran. Useful for architectural intent, **not** for status |

The governing documents live one level above the project root:
`CLAUDE_OPERATING_MANUAL_V1.txt` (highest priority — it defines
required engineering behaviour), `PRODUCT_REQUIREMENTS_V1.txt`, and
`IMPLEMENTATION_ORDER_V1.txt`.

---

## First thing to do in a new session

```bash
npm install
npm run format && npm run lint && npm run typecheck && npm run test && npm run test:ui && npm run build
```

Expected: **0 errors, 0 warnings, 309 + 107 tests passing, build
succeeds.** If that is not what you see, fix it before changing
anything else — you have found drift, and it is now the most
interesting thing in the repository.
