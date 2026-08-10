# PHOS — start here

**If you are an AI assistant opening this project cold, read this file
first and in full. It is the shortest path to being useful.**

---

## What PHOS is

A Personal Hifz Operating System: a calm, offline-first companion for
memorizing the Quran. It schedules new memorization and revision from
evidence-based memory research, explains every decision it makes, and
stores everything on the user's own device.

It is **not** a Quran reader. It never renders the Mushaf, and never
provides a surface anyone could read from: no page images, no
continuous text, no search, no ayah-by-ayah display of a passage being
memorized. The user reads from their own physical Mushaf and PHOS only
says which page to open.

The one deliberate exception, stated here because the rule as written
did not survive contact with the build: **the Dashboard shows a single
rotating ayah with its translation**, as a reminder rather than as
reading material. It is never the page you are working on, it cannot be
navigated, and nothing in PHOS will ever grow from it toward a reading
surface. If you find yourself adding a second ayah, a next-ayah
control, or the text of the page being memorized, you have crossed the
line this paragraph exists to draw.

It has no gamification, no streaks, no accounts and no social features.
These are product constraints, not oversights; do not "helpfully" add
any of them.

Author and product owner: **Qusai**.

---

## Current state — v0.3.0, shipped and in use

|               |                                                    |
| ------------- | -------------------------------------------------- |
| Live at       | https://qusai-badwaniwala.github.io/PHOS/          |
| Repository    | https://github.com/Qusai-Badwaniwala/PHOS (public) |
| Project root  | `phos-handoff/phos-integrated/`                    |
| First shipped | 2026-08-04 (v0.1.0, phases 0–8)                    |
| Current       | 2026-08-10 (v0.3.0, the scheduling-truth fixes)    |
| Database      | version 2 · service worker cache `phos-v5`         |

Twelve build phases complete. **PHOS has real users beyond Qusai**,
which changes what is safe to do: see "If you change how stored data is
produced" below.

### What v0.3.0 fixed

Five defects, all found by opening the app rather than by any test, and
all of them variations on the same theme: **PHOS was telling users
things that were not true.**

- **Onboarding asked for the wrong unit.** It offered four choices
  phrased in Juz, then demanded a page count — arithmetic the user had
  to do unaided, since Juz are not a uniform length. It now asks for the
  **order first**, then for Juz, and converts. "Three Juz" resolves
  against the user's own order, so _Juz 30 first_ gives 64 pages and
  _Standard_ gives something else. `pagesForJuzMemorized()` in
  `client/operations/settings.ts` owns that rule, and both the preview
  and the write call it.
- **Seeding scheduled ~75% more revision per day than the clock could
  fit.** Onboarding sized the cycle at `floor(minutes × 0.8)`, an
  independent guess that a page costs a minute; the Adaptive Engine
  charges 105 seconds for a seeded page. The overflow rolled forward as
  overdue revision every single day.
- **New memorization could be starved forever.** Overdue revision
  outranks new work, and revision that does not fit only gets _more_
  overdue — so once a user's revision filled their day they were never
  offered another new page. `allocateStudyTime()` now admits one new
  page by displacing the least urgent revision, never the last of it.
- **The goal projection invented a pace.** Seeding stamped
  `firstStudiedAt` on pages memorized before PHOS existed, so 304 of
  them read as 304 pages memorized in three weeks. The Dashboard
  announced "at about 16 pages a day" beside "nothing recorded in the
  last seven days". Seeding no longer writes a date it does not know.
- **"Memorized Pages" read 0** for a user who had just declared 300,
  because it counted only `Stable`/`Mastered`.

Plus: the `NumberStepper` buttons announced a bare "Increase"/"Decrease"
with no field name, which only mattered once a screen had two of them.

**One repair ships with this**, `repairEstimatedFirstStudiedDates()` —
see the migration rules below, and note it is the first repair that
deliberately _does_ change what the user sees.

### What v0.2.0 added

- **Goals** — a target chosen as a Juz along the user's own memorization
  order, with a projection measured from real pace and withheld below
  seven days of evidence.
- **Exams** — `/exams`, its own route. A fixed eight-stage ladder, a
  run-up schedule that divides the whole scope evenly across the days
  remaining, Self Exams over any Juz, and a record of exams passed
  before PHOS existed. Exam mode replaces the day's plan and sets aside
  revision outside the scope until the exam is marked passed.
- **A traditional revision cycle** — an optional fixed rotation through
  everything memorized, in the user's own order, repeating. Only
  revision changes; new memorization keeps its pacing. An exam takes
  precedence over both.
- **An exam-wise memorization order** — Juz 30 → 26, then 1 → 25.
- **Blocked seeding**, plus a one-time device repair for anyone who
  onboarded before it.

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
npm run test           # 591 engine + repository tests (Vitest)
npm run test:ui        # 183 component + page + service-worker tests (Jest)
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
route that died without its trailing slash, a passed Self Exam computed
through four layers that no screen rendered, and the Dashboard's two
primary buttons which were dead from the first commit — passed every
test and every type check, and was found by a human opening the app.

So: **run it, click it, and look.** Then write the test that would have
caught it, and prove the test fails without the fix.

**Verify a fix by restoring the defect.** Every regression test in this
codebase was confirmed to fail against the original behaviour before
being accepted. A test that has never failed is not yet a test.

**Two modules agreeing on a value is not the same as sharing one.**
The seeding path and the scheduler each held their own answer to "how
long does a page take" — 60 seconds and 105 seconds. Neither was
unreasonable alone; the bug lived entirely in the gap, and it
compounded daily until PHOS stopped assigning new work. The fix was to
make one ask the other. `tests/unit/operations/seedingCapacity.test.ts`
now binds them: it asks the real duration calculator with the real
config what a seeded page costs, then asserts the seeded cycle fits the
day. Retuning `baseDurationSeconds` keeps it passing; reintroducing an
independent guess of the per-page cost anywhere fails it.

**A number PHOS derives from its own estimates is not evidence.**
Seeding wrote `firstStudiedAt` because a date seemed better than none.
Two features then read those dates as though the user had earned them,
and the Dashboard told a brand-new user their pace was 16 pages a day
while also telling them nothing had been recorded in seven days. When
PHOS does not know something, the honest representation is `null`, and
every consumer already handled `null` correctly.

**Assert what a control _does_, not what it says.** "Start Session" and
"Start Revision" rendered as a bare `<span>` — no href, no handler —
from the first commit until v0.2.1. Both screens stayed reachable from
the sidebar, so nothing was blocked and nobody noticed. Any test
checking the label would have passed; the ones that catch it assert the
`href`.

---

## If you change how stored data is produced — read this first

PHOS stores everything in the user's browser. **There is no server, no
way to reach anyone, and no acceptable way to ask somebody to delete
years of their own Hifz record.** Fixing a rule therefore does not fix
the data that rule already produced.

This is not theoretical. Seeding once spread prior memorization with
`index % cycleDays`, handing one day pages 582, 585, 588, 591 — the
right quantity of revision in an order nobody recites. The rule took
twenty minutes to fix; reaching the people already carrying the old
dates took a whole extra feature.

Three rules, all of them load-bearing:

1. **Schema upgrades may only add.** Guard each step by `oldVersion` in
   `repositories/browser/database.ts`, and test the upgrade path
   directly — `browserRepositories.test.ts` builds a real version 1
   database, puts a page in it, upgrades, and asserts the record
   survived.
2. **A missing field resolves to the behaviour the user already had**,
   never to the new default, and in exactly one place — the repository
   boundary. See `revisionMode ?? RevisionMode.Adaptive` and the goal
   fields in `BrowserSettingsRepository`.
3. **A repair must not change what the user experiences —
   _by way of workload_.** `MemoryEngine.reblockSeededRevision()`
   recomputes nothing: it sorts the dates already stored and re-pairs
   them with pages in order, so the number of pages due on any day is
   arithmetically identical before and after. Repairs live in
   `client/operations/migrations.ts` and run once from the storage
   bootstrap.

   **v0.3.0 narrowed this rule rather than bending it, and it is worth
   knowing why.** `repairEstimatedFirstStudiedDates()` deliberately
   changes what the user is _told_: their goal projection stops
   claiming "about 16 pages a day" and says it needs a week of real
   sessions first. The rule was written to stop a repair silently
   moving somebody's daily load, and this moves none — `firstStudiedAt`
   steers nothing that picks pages. Keeping a flattering wrong number
   on screen in the name of stability would have inverted the point of
   repairing it. The rule now says what it always meant: **a repair may
   correct what PHOS claims; it may not change what PHOS asks of you.**

   The identification test is worth copying if you write another
   repair: a seeded page is one carrying `firstStudiedAt` with **no
   recall event behind it**. That is exact rather than heuristic —
   `firstStudiedAt` has only ever been written by `recordRecall()`,
   which always creates an event, and by seeding, which never does.

**Adding a store means wiring it into every path that crosses all
stores** — reset, backup, export, import, restore. The `exams` store
was added and missed from `resetAllData()`; a scheduled exam would have
survived a full wipe and put the scheduler into exam mode over pages
that were no longer memorized.

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

Expected: **0 errors, 0 warnings, 591 + 183 tests passing, build
succeeds.** If that is not what you see, fix it before changing
anything else — you have found drift, and it is now the most
interesting thing in the repository.

(This line said "309 + 107" from v0.1.0 until v0.3.0, long after both
numbers were wrong. If you change the counts, change them here too —
a baseline nobody can verify is not a baseline.)
