# PHOS v1.0 — Phase Progress

Living status document for the 9-phase delivery of PHOS v1.0. **Read this
first when resuming work in a new session** — it records what is done, what
is mid-flight, and why decisions were made, none of which is derivable from
the code alone.

> **Resuming after a long gap? Read [`docs/HANDOFF.md`](HANDOFF.md)
> first.** It is one page and covers the current deployed state, how to
> run and ship the project, and the gaps that are known. This file is
> the full historical record behind it — read it second, for _why_
> things are the way they are.

## ▶ Resuming in a fresh session — start here

1. Read this file top to bottom, then `docs/product-guide-source.md`.
2. Read the three governing documents in the **workspace root** (one level
   above the project): `CLAUDE_OPERATING_MANUAL_V1.txt` (highest priority —
   it defines required engineering behaviour), `PRODUCT_REQUIREMENTS_V1.txt`,
   and `IMPLEMENTATION_ORDER_V1.txt`.
3. Project root is `phos-handoff/phos-integrated/`. It is **not** a git
   repository — there is no commit history to read and no way to revert via
   git.
4. Confirm the baseline is green before changing anything:
   `npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build`
   Expected after Phase 9: **0 errors and 0 lint warnings**, 259 tests
   passing, static build succeeds into `out/`.
5. Pick up at the first phase in the status table below that is not
   ✅ Complete.

**Environment already set up** (do not redo): `node_modules` installed,
`package-lock.json` committed. There is no `.env`, no database file and
no seed step any more — since Phase 9 the data lives in the browser's
IndexedDB and is seeded when the app first opens.

**Do not trust the older docs.** `integration-review.md`,
`merge-report.md`, `root-cause-investigation.md` and
`stabilization-pass-2-notes.md` describe work done before the project was
ever built or run. Their claims of "zero TypeScript errors" and "fully
tested" were false — verified in Phase 0. They remain useful for
_architectural intent_, not for status. In particular,
`stabilization-pass-2-notes.md` blames the "60 pages" bug on a stale
database; that was wrong, and Phase 1 proved it.

The authoritative plan documents remain `IMPLEMENTATION_ORDER_V1.txt`,
`PRODUCT_REQUIREMENTS_V1.txt`, and `CLAUDE_OPERATING_MANUAL_V1.txt` in the
workspace root. The 9 phases below subdivide that roadmap; they do not
replace it.

## Standing quality gate

Every phase must end with all of these passing:

```
npm run format:check   npm run lint      npm run typecheck
npm run test           npm run test:ui   npm run build
app boots; all 9 routes 200; regression walk of every page
```

## Approved product decisions (2026-08-03)

1. **Additive Prisma migrations approved** for Phase 4 (Requirements 1, 2, 9).
2. **Recall input model: "flag only the weak pages."** Pages default to a
   successful recall; the user marks only the ones that felt shaky. Replaces
   today's hardcoded `successfulRecall: true / Medium`.
3. **Danger Zone implemented properly** — real reset and real delete, typed
   confirmation, automatic backup taken immediately before deletion.
4. **Full autonomy between phases**, stopping at each phase boundary with a
   report.
5. **The product guide moves into the app.** The PHOS Guide PDF (authored
   by Qusai) is being retired as a separate document; its content becomes
   part of the application itself — an explorable About/guide experience
   rather than a file people have to keep. Copy is preserved in
   `docs/product-guide-source.md`. Split across Phase 4 (first-time
   expectations) and Phase 7 (full About page + FAQ).
6. **Author attribution.** A "By Qusai" credit appears in the app, given a
   restrained gold treatment. Gold genuinely suits the existing palette —
   the app runs on warm sand (hue 24–36) against a maroon primary
   (356 32% 33%), and the logo already uses a bronze/tan. A muted gold
   near hue 38–40 sits naturally between them; it must be introduced as a
   proper token, not a one-off hex.

## Phase status

| Phase | Scope                                                                    | Status      |
| ----- | ------------------------------------------------------------------------ | ----------- |
| 0     | Toolchain & Boot                                                         | ✅ Complete |
| 1     | The Contract (§3.1 + §3.2)                                               | ✅ Complete |
| 2     | Session Resilience (§3.3, §3.8, §3.9, §3.11)                             | ✅ Complete |
| 3     | Honest UI (Settings, Danger Zone, Backup)                                | ✅ Complete |
| 4     | Schema Foundation + Requirements 1, 2, 6 (+ first-run expectations copy) | ✅ Complete |
| 5     | Requirements 4, 5, 9                                                     | ✅ Complete |
| 6     | Requirements 3, 7, 8 (engine intelligence)                               | ✅ Complete |
| 7     | Production Hardening (+ PWA icons, About/guide, "By Qusai")              | ✅ Complete |
| 8     | Release Audit                                                            | ✅ Complete |
| 9     | Static PWA migration — engines and database into the browser             | ✅ Complete |

### Added scope — in-app guide, PWA icons, attribution

Folded into existing phases; no new phase is needed.

**Phase 4** — Requirement 6 (First-Time Guidance & Expectations) draws its
copy from §9 of `product-guide-source.md` ("What PHOS is — and isn't").
That section is almost exactly what the requirement asks for, so the guide
supplies the wording rather than inventing new text.

**Phase 7** — three related pieces:

- **PWA icon set** generated from the supplied PHOS logo (cream ground,
  bronze arch, open Mushaf, crescent). Needs `public/phos-logo.png` as the
  square source — see "Blocked on input" below. Produces the manifest
  icons (192, 512, maskable), apple-touch-icon and favicon.
- **About page rebuilt as the guide.** The Release Candidate prompt's
  requested section list (Introduction · What is PHOS · Core Philosophy ·
  Scientific Foundation · Adaptive Learning · Why PHOS is different ·
  Privacy · Local-first · Future Vision · Acknowledgements) maps almost
  one-to-one onto the guide, so the PDF becomes the About page's content
  rather than a separate download. The FAQ (§8) becomes an explorable
  accordion — `components/ui/accordion.tsx` already exists and is
  currently unused, so this needs no new component or dependency.
- **"By Qusai" attribution** in a restrained gold, introduced as a real
  design token in `globals.css`/`tailwind.config.ts` alongside the
  existing palette variables, not a hardcoded colour.

**Accuracy gate.** The guide describes the intended PHOS and is ahead of
the build in several places — it claims offline support, PWA
installability, working backup and working settings. None of that copy may
ship before the corresponding phase has actually delivered it; "no
misleading wording" is a stated release criterion. The inaccuracies are
tabulated at the end of `product-guide-source.md`.

### Blocked on input — resolved

- ~~`public/phos-logo.png`~~ — **not actually blocked.** The logo was
  already in the repository as `public/PHOS app logo.png`; the note above
  was stale. Phase 7 generated the full icon set from it via
  `npm run icons`.

---

## Phase 0 — Toolchain & Boot ✅

The repository had never been installed, built, or run. Every "zero errors /
fully tested / verified" claim in the pre-existing `/docs` was false, because
prior verification used hand-written stubs rather than a real toolchain.

Fixed: unresolvable dependency tree (`eslint-config-next@14` rejects ESLint 9
and lacks `next/typescript`); a `lint` step that hung on an interactive prompt
(Next 14's `next lint` cannot read flat config — switched to `eslint .`); 28
TypeScript errors; 6 lint errors; 4 failing tests (all defective test data,
not defective production code); a failing build (`next/font` in 14.2.0 breaks
on Node 24 — upgraded to `^14.2.35`, which also clears the security
advisory); **three API routes silently prerendered as static** and therefore
serving a frozen build-time snapshot in production; and a Windows bootstrap
that never created `.env`, migrated, or seeded.

Also ran a repository-wide Prettier pass (189 files) here deliberately —
Phase 0 is the only phase with no behaviour change, so a mechanical reformat
is cleanly reviewable and won't contaminate later diffs.

**Deferred to Phase 7:** `next.config.mjs` sets `output: "standalone"` but
`package.json` runs `next start`, which Next warns is unsupported; and
`.next/standalone/.next/static` is never populated, so a real standalone
deploy would serve no JS or CSS.

## Phase 1 — The Contract ✅

Two defects fixed together, atomically, because fixing either alone would
have left the app worse.

**§3.1** — `toStudyItemDTO()` never emitted `workloadCategory`, while all
three frontend adapters filtered on exactly that field. Result: every
scheduled page fell into Revision, Session was permanently empty, and the
revision assignment was mislabelled "Sabqi". Added the field to
`StudyItemDTO` and the mapper; gave `/session/today` a named
`DailyStudyPlanDTO`; replaced three hand-copied `BackendStudyItem`
interfaces with `lib/api/wire.ts` re-exporting the backend's real types; and
switched comparisons to the shared `WorkloadCategory` enum. The type-safety
work is the part that stops this recurring.

**§3.2** — The Adaptive Engine returns one priority-ordered plan for the
whole day, and revision always outranks new memorization, but
`submitRecall()` enforces strict sequential progression through the loaded
plan. So a Sabaq session's cursor sat on a revision page and the first
new-memorization recall was rejected outright. The sequential invariant was
**not** relaxed (it is deliberate and explicitly tested). Instead
`loadDailyPlan()` now narrows the day's plan to the categories the active
session's `SessionType` owns — see `engines/learning/constants/`.

Consequence, accepted by the user: a revision assignment is scoped to one
`SessionType` rather than mixing all four, because `/session/start` commits
to a single type and recording Manzil or Recovery work as "Sabqi" would
corrupt history and analytics.

Tests: 107 → 125. Both fixes verified by temporarily reverting them — 9 of 12
new assertions failed against the pre-fix code.

## Phase 2 — Session Resilience ✅

Scope:

- **§3.3** — Session state lives only in the `LearningEngine` singleton's
  memory. `/session/finish` takes no `sessionId`; `/session/recall` validates
  one then discards it. A server restart leaves `localStorage` claiming a
  session is in progress while the backend has forgotten it, so every action
  throws `SessionNotStartedError` with no way out. `resumeSession()` exists
  on the engine but no route exposes it.
- **§3.8** — Completion issues two sequential HTTP requests per page (120 for
  a 60-page day), with no progress indication, no disabled state on the
  button, and no defined behaviour if it fails part-way.
- **§3.9** — `AdaptiveEngine.getPagesStudiedToday()` floors to **UTC**
  midnight while `lib/api/dashboard.ts` buckets days in **local** time. For a
  non-UTC user these disagree about which day work belongs to.

### What was done

**The persisted `Session` row is now the single source of truth** for "a
session is in progress". Local storage was demoted to a cache of the page
list, which is the only thing the server genuinely cannot reconstruct (the
SDS schema stores facts, not scheduling).

- `ISessionRepository.findActive()` — the newest session with no
  `completedAt`.
- `LearningEngine.ensureActiveSession(sessionId)` — rehydrates from
  persisted state when this process has lost the session; a no-op on the
  normal path, so it costs nothing when nothing has gone wrong.
- `LearningEngine.findActiveSession()` — returns the open session plus the
  pages already recorded in it, built from rows rather than memory.
- `GET /session/active` — new endpoint the client uses to reconcile.
- `/session/recall` and `/session/confidence` now **honour** the
  `sessionId` they were already validating and discarding.
- `POST /session/finish` now takes `{ sessionId }`. It previously took no
  body and completed whichever session happened to be in memory, which
  made it unusable after a restart and ambiguous at the best of times.

**§3.11 (found during Phase 1, fixed here)** — `startSession()` now rejects
a start while another session is open, checked against persisted state.
Previously a second start silently replaced the first in memory and
orphaned its row forever.

**Finish Later now closes the session** rather than abandoning it. An open
row would otherwise remain "the active session" indefinitely and block the
next one. Pages never studied simply stay unstudied and are rescheduled —
"completed work remains persisted; incomplete work remains incomplete".

**§3.8** — completion is resumable and visible. `submitRemainingPages()`
skips pages the server has already recorded, so an interrupted completion
is retried rather than replayed (a replay would be rejected anyway, since
the engine advances strictly in order). Controls take `pending` and
`pendingLabel` props: every button is disabled while a request is in
flight, and a "Saving page N of M…" status is announced via `aria-live`.
Requests remain one-per-page because the engine's progression is
sequential by design; batching would need a new bulk endpoint and is an
optimisation, not a correctness fix.

**§3.9** — `shared/utils/date.ts` defines the day boundary once
(`startOfLocalDay`, `isSameLocalDay`) and `AdaptiveEngine` uses it. Kept
deliberately separate from _elapsed_-time scheduling in
`PriorityCalculator`, which is calendar-independent and must stay that way.

### Verification

Tests 125 → 135. The decisive check was a real interrupted session: start a
Sabaq session, record 2 of 4 pages, **kill the server process**, restart,
and confirm from a fresh process that the session survived with both pages
intact, that recall and confidence were accepted, that finish succeeded
(`pagesCompleted=4`), that the session then closed, and that a new session
could start. Every one of those steps failed before this phase.

Also confirmed live: `/session/active` returns `null` when nothing is open,
and a second `/session/start` while a session is open is rejected.

### Known limitation

`SESSION_REHYDRATION_STUDY_MINUTES` (24h) is used when rebuilding a plan
for a session whose original study budget is not persisted. This is safe
rather than exact — ranking is priority-based and independent of the
budget, so a larger budget can only append lower-priority items, leaving
the prefix identical. Persisting the session's own budget would make it
exact; revisit in Phase 4 when the schema opens.

## Phase 3 — Honest UI ✅

The theme of this phase: **every control now does what its label says,
or it is gone.** Three screens were making promises the code did not
keep.

### What was actually broken

- **Settings persisted nothing.** All nine controls were uncontrolled
  (`defaultValue`/`defaultChecked`) with no `onChange`. `saveSettings()`
  existed and was exported but had no caller anywhere in the app. Worse,
  none of the nine values was _read_ by anything either — flipping a
  switch changed no behaviour even within the same page load.
- **Danger Zone was a no-op.** Both confirm handlers were
  `() => setOpen(false)`. "Delete Local Data" deleted nothing, and no
  delete-all capability existed anywhere in the codebase.
- **Backup was theatre.** "Create Backup" had no handler at all.
  Restore's "Browse" button assigned a hardcoded string
  (`phos-backup-2026-07-29.zip`) and its confirm closed the dialog.
  Import and Export had no handlers. The delete button in the history
  table did nothing. Meanwhile the `PersistenceEngine` behind them was
  real, complete and working — only the wiring was missing.
- **`SelectValue` displayed the raw stored value**, so the Date Format
  control read "mdy" rather than "MM/DD/YYYY".

### What was done

**Settings now persist and take effect.** A `SettingsProvider` holds
preferences for the whole application; `ThemeProvider` keeps sole
ownership of the theme (it is what applies the class before paint) and
the new provider adds the one thing it lacked — writing the choice to
the database so it travels with an export. Each preference now drives
something real: reduced motion and compact mode via root-element classes
in `globals.css`, date/time format via a new `lib/format.ts`, and the
session/revision display options via `StudyLayout`. "Confirm Completion"
puts a dialog in front of session completion.

**`Auto-advance` was removed rather than wired.** Neither Session nor
Revision marks pages one at a time — completion records the whole
assignment in a single action — so there is no "next page" to advance
to. A toggle that can never do anything is exactly the dishonesty this
phase exists to remove. It belongs back if per-page stepping is built.

**Danger Zone is real**, per the approved decision.
`PersistenceEngine.resetAllData()` takes a **verified backup first** and
only then deletes, children-first (recall events → session items →
sessions), because `schema.prisma` uses `onDelete: Restrict` throughout
and any other order is rejected by the database. Pages are _reset_, not
deleted — the 604 rows are the Mushaf's fixed structure, not user data.
Deletion requires typing `DELETE`, and that phrase is re-checked
server-side rather than trusted from the UI.

**Backup is fully wired**: create, restore (choosing from real backups
rather than a fake file picker), export with a genuine download, import
by real file upload, and delete. `LearningEngine.discardInMemoryState()`
was added and is called after reset, restore and import, because the
engine caches the active session in memory and would otherwise keep
operating on rows that no longer exist.

### Defect found by running the application

Restoring a backup **erased backup history**. `BackupMetadata` rows live
inside the very SQLite file that restore overwrites, so restoring
rewound the history to whatever it was when that backup was taken.
Observed live: two backup files sat in `database/backups/` while
`/backup/list` reported **zero** — including the safety backup that made
the restore reversible. The recovery path vanished from the UI at
precisely the moment a user would reach for it.

Fixed at the root: the engine now reconciles the table against the
backup directory, treating the files and their manifests as the source
of truth (which is what SDS Part 8 already implies by scoping
`BackupMetadata` to "metadata only"). A verified file with no row gets
its row rebuilt from its manifest — real `createdAt`, not the current
clock; a row whose file has vanished is dropped so the UI never offers a
restore that cannot succeed. No schema change was needed.

### Verification

Tests 135 → 154. The `resetAllData` suite asserts the ordering directly
from a call log, and the "backup fails ⇒ nothing is deleted" case was
confirmed to genuinely catch a regression by temporarily starting the
backup concurrently instead of awaiting it — the test failed, as it
should.

Verified against the running application, not just in tests: recorded a
real recall event, then **deleted everything** (`deletedRecallEvents: 1`,
`deletedSessions: 1`, `resetPages: 604`), confirmed the distribution went
to 604 Unseen, then **restored from the automatic pre-delete backup and
watched the work come back** (603 Unseen / 1 Encoding, session and recall
count intact). Also confirmed: the `DELETE` phrase is enforced
server-side, all four import-validation failures reject without touching
the database, a valid import succeeds, the upload staging file is
cleaned up, and backup create/delete round-trips. All 9 routes return 200.

### Deliberate trade-off

Date/time formatting is applied in the `lib/api/*` adapters, which
convert timestamps to display strings at fetch time. A format change
therefore takes effect on each screen as it loads rather than instantly
repainting a screen already open. The Settings page shows no dates
itself, so in practice the user changes the setting, navigates to
History, and sees the new format. Formatting at render instead would
mean moving every date across History, Analytics, Dashboard and Backup
into the component layer — a worthwhile tidy-up, but not a correctness
fix.

### Known limitation

Client-only preferences (date/time format, motion, density, session and
revision display) live in `localStorage`. For a local-first, single-user
application that is genuine persistence, but it is **not portable** —
those values do not travel with a backup or export, and clearing site
data resets them. Only `theme` is stored server-side. Moving the rest
into the database is a candidate for Phase 4, where an additive
migration is already approved.

## Phase 4 — Schema Foundation + Requirements 1, 2, 6 âœ…

**Migration** `20260803144727_add_preferences_onboarding_roadmap`,
additive and verified non-destructive (604 pages and the settings row
survived intact). Added display preferences, onboarding answers and
`memorizationOrder` to `Settings`, plus a `RoadmapEntry` table.

**Requirement 2 — Flexible Memorization Order.** The defect was subtle
and total: `rankPages()` broke ties by `pageNumber` ascending, which
hard-coded the standard order for every user regardless of preference.
The roadmap now governs new-memorization ordering, and **only** new
memorization — revision deliberately ignores it, because Requirement 2
states "Already memorized pages remain memorized. Only future scheduling
changes." Filtering revision by the roadmap would strand real work.

Verified live: a user who chose Juz 30 first, reporting 20 pages already
memorized, had those pages attributed to **582–601** (the start of Juz 30) rather than pages 1–20, with Juz 1 untouched. Pausing Juz 30 then
moved new memorization to Juz 1 while **revision of the paused Juz
continued** — the guarantee that matters.

**Requirement 1 — Onboarding.** A four-step wizard, gated in `AppShell`
on `onboardingCompletedAt`. Answers seed the engine: the daily study
budget replaces a hardcoded 60 minutes, and reported prior memorization
is seeded through `MemoryEngine.seedPriorMemorization()` — kept inside
the Memory Engine because it alone may write `memoryState` (SDS Part
10). Seeded pages get a deliberately modest `Growing` profile, not
`Mastered`: PHOS has no evidence about them, and suppressing revision
for weeks on untested material is the opposite of "retention wins".

One detail mattered more than it looks: `lastSuccessfulRecallAt` is set
alongside `lastReviewedAt`. Setting only the latter would make
`didLastReviewFail()` read "reviewed but never recalled successfully"
and file a Hafiz's entire Hifz under Recovery on day one.

**Requirement 6** copy lives in one module rendered by both the wizard
and About, so the two cannot drift.

**Preferences moved server-side** (the approved decision), so they now
travel with a backup and an export.

**Caught by running it:** resetting settings silently switched a
Juz-30-first user back to Standard order — a scheduling change from a
button that promises not to touch memorization. `memorizationOrder` is
now excluded from `resetToDefaults()`.

## Phase 5 — Requirements 4, 5, 9 âœ…

**Requirement 4 — Transparent Recommendations.** `ExplanationCalculator`
builds the day's account from the same numbers the scheduler used —
category counts, the time budget, pages withheld. It stays silent on an
ordinary day ("Routine operations should not constantly interrupt the
user") and never guesses at a reason.

**Requirement 5 — Recovery After Missed Days.** `ReturnCalculator`
grades the gap and reduces new memorization only — revision is never
cut, since a returning user needs more of it. Messages are tested
against a forbidden-vocabulary list, because "never display messages
implying failure or guilt" is a requirement, not a preference.

**Requirement 9 — User Control.** `POST /pages/log-memorized` records
work done outside PHOS, resolved along the user's roadmap so "3 more
pages" means the next three _they_ would have reached. Pages PHOS
already tracks are skipped rather than overwritten.

**Caught by running it:** the returning-user allowance was applied to
every _eligible_ page. With ~600 pages unstudied and a 45-minute day,
scaling 600 by 0.6 still left far more than could fit, so the time
budget bound first and the plan came out **completely unchanged** — the
reduction existed only on paper. It is now measured against the plan the
user would otherwise have received. Verified: 10 → 6 → 3 → 0 new pages
as the absence lengthens, with revision constant at 20 throughout.

Also replaced a full-table scan (`findBetweenDates` over all sessions,
on every plan generation) with `ISessionRepository.findLastCompleted()`.

## Phase 6 — Requirements 3, 7, 8 + the recall input model âœ…

**Recall input model** (the approved decision): pages default to a
successful recall and the user flags only the ones that felt shaky.
Completion previously hardcoded `successfulRecall: true, Medium` for
every page — so the Memory Engine received the same input no matter what
happened. Flagged pages are now recorded as a failed recall with `Low`
confidence, unflagged as success with `High`. Verified end-to-end: an
unflagged page reached `Growing` (strength 0.52), a flagged one dropped
to `Fragile` (0.15).

Asking for an explicit verdict on all 20 pages was rejected deliberately
— a form that long gets answered carelessly, and careless answers are
worse data than the default.

**Requirements 3, 7, 8 — `WorkloadCalculator`.** Observes a rolling
30-day window of real recall and recommends the daily new-memorization
target. A trailing window _is_ the mechanism for "PHOS must never
permanently classify users": evidence ages out on its own, so neither a
hard month nor an easy one keeps a vote forever. Below 20 recall events
the user's own estimate stands untouched, which enforces "never increase
on one unusually good session".

**Caught by running it, and the most serious defect of the whole
project:** a user recalling **45%** was handed an _increase_, explained
as "Your recall has held at 45% recently". The observed pace had
overwhelmed the retention penalty. That is simultaneously a violation of
Requirement 7's core rule and exactly the fabricated explanation
Requirement 4 forbids — and it was invisible to every unit test, because
the test fixtures used realistic paces.

Fixed with an explicit **retention gate**: the target may exceed the
user's stated comfortable pace _only_ when recall is genuinely strong.
The rationale now keys on the evidence rather than the direction, so the
wording cannot contradict its own number even if the gate changes.
Verified after the fix: 45% → steady, 78% → steady, 97% → increase.

## Phase 7 — Production Hardening, Guide, Attribution âœ…

**PWA.** The "blocked on input" note was stale — the logo was already in
the repository. `npm run icons` generates the full set (192/512 plus
maskable variants inset to the 80% safe zone, apple-touch-icon,
favicons). Manifest, service worker and an offline page were added.

The service worker deliberately **never caches API responses**: serving
a stale study plan could let a user record work against pages no longer
scheduled.

**The offline claim was corrected, not delivered.** The guide said PHOS
"works entirely without an internet connection" — true, and a real
strength, but it was being read as "works when the application is
closed", which is false. The in-app guide now states the true claim and
marks the boundary; `offline.html` says PHOS is not running and the
user's progress is safe, rather than blaming the network.

**About rebuilt as the guide**, with an FAQ accordion and a "By Qusai"
credit using a new `gold` token (hue 39, sitting between the warm sand
surfaces and the maroon primary, beside the logo's own bronze) reserved
for attribution alone.

### Defects found while hardening

- **`asChild` was accepted and ignored by `Button` while twelve call
  sites relied on it** — every empty state, the 404 page, and both
  dashboard primary actions. Each rendered an `<a>` nested inside a
  `<button>`: invalid HTML and two nested interactive controls for
  keyboard and screen-reader users. Now implemented; verified 0
  occurrences across all pages.
- **`onPointerDownOutside` was accepted and ignored by `Dialog`**, so a
  backdrop click dismissed a confirmation mid-operation. Now honoured,
  and destructive dialogs refuse to close while running.
- **The dialog had no focus management or focus trap**, on a component
  every destructive confirmation in PHOS goes through. Added
  `role="dialog"`, `aria-modal`, labelling, focus restore and a Tab
  trap.
- **The accordion recovered its own value through an `any` cast**, so a
  mis-wired trigger silently never opened. Rebuilt with context.

### Security and deployment

- **`next start` binds to all interfaces by default**, exposing a
  no-authentication, single-user app to the local network. Now bound to
  `127.0.0.1`. Verified: reachable on loopback, refused from the LAN.
- **`Start PHOS.bat` ran `npm run dev`** — an unoptimized development
  server for a real user. It now builds and runs production, skipping
  the rebuild when it is already current.
- **`output: "standalone"` was set while `npm start` runs `next start`**,
  a combination Next warns against, and the bundle was never completed
  (Next does not copy `public/` or `.next/static`). The permanently
  broken artifact is gone; `npm run build:standalone` assembles a
  genuinely complete one for anyone who wants it.

**Lint: 7 warnings → 0.** None suppressed; each was a real defect.

### Known limitation: dependency advisories

`npm audit` reports advisories against `next@14.2.35` (the latest 14.x).
Every one requires Next 15.5.21+, i.e. a major upgrade. They are almost
all DoS or cache-poisoning issues that need a remotely reachable server;
PHOS now binds to loopback, has no middleware, i18n, Server Actions,
remote images or custom server. The upgrade is recommended as post-1.0
maintenance, where it can be verified properly, rather than as an
unverified major bump at the end of delivery.

## Phase 8 — Release Audit âœ…

Audited against a **freshly rebuilt database** — migrations applied and
seeded from empty — so the first-run path was exercised genuinely rather
than around existing data.

Walked end to end: first-run state → onboarding (Juz 30 first, 1
page/day) → day-1 plan correctly offering exactly **one** page, 582 →
start, recall, confidence, finish → dashboard, history and analytics
reflecting it → backup → export → **delete everything** → restore →
data back, with backup history intact. All 9 routes 200 throughout, and
no errors in the server log.

**Found and documented:** `ayahRotationFrequency` is stored and exposed
by the API but does nothing — the dashboard's Ayah is advanced by the
user, not on a timer. The SDS mandates the column so it stays, but it is
now marked in `schema.prisma` as unused, with an explicit instruction
not to add a Settings control until it drives real behaviour. A visible
switch that changed nothing is what Phase 3 existed to remove.

### Final state

| Gate         | Result                           |
| ------------ | -------------------------------- |
| format:check | clean                            |
| lint         | **0 errors, 0 warnings**         |
| typecheck    | 0 errors                         |
| test         | **203 passing** (135 at Phase 2) |
| test:ui      | passes (no component tests)      |
| build        | succeeds                         |
| routes       | all 9 return 200                 |

### Recommendations for future maintenance

1. **Upgrade Next.js to 15.x or 16.x** and re-verify. This clears every
   outstanding advisory. Do it as its own piece of work, not folded into
   a feature change.
2. **Add component tests.** `npm run test:ui` is wired to Jest and
   passes with none. The engines are well covered; the React layer is
   covered only by the manual walkthroughs recorded here.
3. **Revisit `ayahRotationFrequency`** — give it behaviour or retire it.
4. **Consider persisting a session's own study budget.** The 24-hour
   rehydration constant noted in Phase 2 remains a safe approximation
   rather than an exact one.
5. **Watch the workload calculator against real usage.** Its constants
   (30-day window, 20-event minimum, the retention thresholds) are
   reasoned defaults, not tuned values. They are all in one file.

## Post-release fixes — found by the product owner using the app

The release audit in Phase 8 walked the API. These were found by a real
person completing onboarding and looking at the dashboard, which is why
they matter: none of them showed up in 203 passing tests.

### Two real bugs

**1. The plan explanation blamed the clock for the daily target.**

A user with a 1-page daily target and 60 minutes free was told
_"59 pages did not fit in 60 minutes"_. The clock had excluded nothing —
the daily target had. `ExplanationCalculator` inferred the reason by
subtracting the final plan from the pre-cap plan and attributed the
whole difference to time.

Fixed by removing the inference: each exclusion is now attributed by the
caller, which knows which rule made it. `ExplanationInputs` takes
`withheldByDailyTarget`, `revisionDroppedForTime` and `dailyTarget`
separately, and the time budget is only ever cited for revision, which
is genuinely time-bound. New memorization is explained as what it is — a
pace decision the user themselves set.

**2. Memory Health showed 45% with zero recall events.**

Straight after onboarding, every page's strength and stability are
values PHOS _assumed_ from the user's estimate of what they had already
memorized. Blending those into a confident "45%" presents an assumption
as a measurement, on the screen the user trusts most.

`MemoryHealth` and `RetentionQuality` now report how much evidence
backs them (`assessedPages`, `assessedRecallEvents`). The dashboard
withholds both scores until at least one real recall exists, falling
back to the honest "Not enough data yet" state both cards already had.
A single recorded recall brings them back.

### One thing that was correct but unexplained

"Page 53" after choosing Juz 30 first with 75 pages memorized looked
wrong and was not. Juz 30 is only 23 pages (582–604), so 75 covers all
of it plus pages 1–52, making 53 the next new page — in Juz 3,
Aal-Imran.

The arithmetic was right; nothing communicated it. Three additions:

- **Surah reference data** (`shared/constants/mushaf.ts`): all 114
  surahs with Arabic names and start pages for the 604-page Madani
  Mushaf. This is metadata in the same category as the `juzNumber`
  already stored on every Page — no Quran text is stored or rendered.
  Guarded by tests including a cross-check that An-Naba's start page
  (582) agrees with the seeded Juz 30 boundary.
- **`juzNumber` threaded** from `StudyItem` through to the frontend; the
  dashboard shows Surah, Arabic name and Juz beside the page number.
- **An onboarding preview** (`GET /settings/onboarding/preview`) showing
  what the answers will do _before_ they are saved: "will mark 1–52,
  582–604 (Juz 1, 2, 3, 30); next new page 53 Â· Aal-Imran Â· Juz 3". It
  runs the same `getMemorizationSequence()` the real seeding uses, so
  preview and outcome cannot disagree.

A test caught an error in my own understanding here: I had asserted page
53 was in Al-Baqarah. It is in Aal-Imran, which begins on page 50.

### Interface honesty and polish

- **Import's "Choose file" had no button.** The `file:` utilities
  stripped the native chrome without replacing it, leaving bare black
  text with no sign it was clickable. Styled as a secondary button.
- **Number inputs rendered white native spinners** that ignored the
  theme. Replaced with `NumberStepper` — themed âˆ’ / + controls with
  larger targets (also usable on a phone), clamping, and half-step
  support for fractional page targets.
- **"By Qusai" added to the sidebar** beneath the wordmark, using the
  `gold` token with a slow sheen (`.phos-shimmer`) that collapses to
  static text under Reduced Motion.

### Verification

Tests 205 → 215. Re-verified live on a rebuilt first-run database using
the product owner's exact answers (75 pages, Juz 30 first, 60 minutes):
the preview reports the correct ranges, the explanation no longer
mentions the clock, and health scores stay withheld until a real recall
is recorded — then return.

## Scheduling and surah work — round two of product-owner findings

Five changes, two of them correctness bugs that every existing test had
passed over.

### 1. Seeded pages all came due on the same day, forever

Seeding stamped every page with the same stability (3 days) and
timestamps within milliseconds of each other. A user reporting 23
memorized pages got 23 due at once — and, keeping identical stability,
would get 23 at once again every cycle. That is the opposite of what
spaced repetition is for.

Review dates are now **staggered across a cycle sized to the volume**.
The cycle scales with how much is memorized and the user's own time
budget, so a beginner with 20 pages and a Hafiz with 604 both get a
cycle they can actually complete — roughly `capacity` pages a day
rather than an impossible block.

Verified live with the reported scenario: 23 pages now arrive **8 / 8 /
7** across three days instead of 23 at once.

### 2. "Half a page a day" silently meant a page every day

`capNewMemorization()` did `Math.ceil(target)` afresh each day, so any
fractional target was rounded up to a full page daily. Someone who
needs 2Â½ days per page was being pushed 2Â½Ã— too fast — precisely the
overload Requirement 7 exists to prevent.

Worse, the code comment above it _claimed_ fractional targets were
"honoured across days rather than within one". That behaviour had never
been implemented.

Now genuinely paced across days, using a new additive column
`Page.firstStudiedAt` (migration
`20260804012229_add_first_studied_at`) — a fact worth storing in its
own right, stamped once by the Memory Engine when a page leaves
`Unseen`. `lastReviewedAt` could not serve: revising an old page would
have looked like starting a new one.

Verified live: at a pace of 1 a page is offered daily; at 0.5 and 0.25
it is correctly withheld one day after the last new page.

The wizard now asks **"How long does one page usually take you?"** with
plain options ("A page every 3 days") rather than demanding a decimal.
The workload floor dropped from 0.5 to 0.25 so the engine can ease
someone genuinely slower.

### 3 & 4. Surah-aware assignments

Juz 30 contains **37 surahs across 23 pages**, twelve of which hold two
or three surahs each. "Memorize page 602" is the wrong unit — nobody
memorizes two-thirds of Al-Ma'un.

The _scheduling_ unit stays the page, which is correct for the memory
model and avoids rebuilding the schema around surahs. Only the
_presentation_ changed:

- `surahsOnPage()` returns every surah touching a page
- Assignments list each page with its surahs, in both scripts
- The weak-page flagger labels dense pages by surah — "Quraysh Â·
  Al-Ma'un Â· Al-Kawthar" with the page number kept small alongside —
  and by page number elsewhere, where a page is a fragment of one long
  surah

### 5. A heavy day is named, not trimmed

A hard revision cap was considered and rejected: dropping genuinely due
pages lets them decay and returns them later as Recovery work, buying a
comfortable today at the cost of a worse month. Requirement 9 settles
it — "PHOS recommends. The user decides."

`detectWorkloadWarning()` flags a long day and names what would cost
least to leave — only long-term checks on well-known material, never
Recovery or overdue work.

**A defect found while verifying it:** the first version triggered on
"estimated minutes exceed the budget", which can _never_ happen —
`allocateStudyTime()` already guarantees the plan fits. It was dead
code dressed as a safety check. Replaced with the two signals that are
real: a large scheduled page count, and a genuine backlog of pages that
were due but displaced by time. The backlog is the more useful of the
two, because it is otherwise invisible — the day looks finished while
revision quietly falls behind.

### Verification

Tests 215 → 233. Both scheduling fixes were confirmed to catch their
original defects by temporarily restoring the old behaviour: five tests
failed, as they should.

Two of my own test assertions were wrong and the suite caught them —
one asserted the opposite of its own test name, another expected the
wrong message branch.

## Phase 9 - Static PWA migration

The product owner's goal, in their own words: upload it, get a link,
share it; anyone opens the link, installs it, and PHOS is running - their
data on their own device, no login, no npm, no technical knowledge.

The full plan and an outcome section recording what was built and what
was decided differently are in `docs/phase-9-static-pwa-plan.md`. What
follows is the short version.

### What moved

The five engines and the database now run in the browser. IndexedDB
replaced SQLite, `client/container.ts` replaced `server/container.ts`,
and `client/operations/` replaced `app/api/v1/**/route.ts` - the same
validation, the same engine calls, the same mappers, minus the HTTP.

The SDS's dependency-injection rule is the entire reason this was a
migration rather than a rewrite, and the prediction held exactly: **no
engine and no engine test changed.** 215 engine tests written against
SQLite passed against IndexedDB on the first run.

### What was deleted, not kept dormant

`app/api/**`, `server/`, `prisma/`, the six Prisma repositories,
`lib/prisma.ts`, `lib/config/env.ts`, the SQLite `PersistenceEngine`,
the four `.bat` launchers and the eleven server-era scripts.

Shipping both storage layers would have meant two definitions of "your
data is safe" with only one of them reachable. The local database was
exported to `database/exports/` first, so the test data collected across
Phases 4-8 can be imported into the browser build.

### A Phase 3 defect designed out rather than fixed

Backup history used to live inside the database a restore overwrote, so
restoring rewound the list of backups and the safety copy taken seconds
earlier vanished - patched then with filesystem reconciliation.
`writeSnapshot()` now excludes the `backups` store, so a restore cannot
touch backup history at all. Two tests assert it, and both were
confirmed to fail when the old behaviour was temporarily restored.

### What the app now claims, and what it admits

The guide's original sentence - "works entirely without an internet
connection" - had been narrowed in Phase 7, because the data lived
behind a server that had to be running. It is now literally true and is
stated without hedging.

The same accuracy gate cuts the other way, so three things the source
guide never mentioned are now said in the app, on the last screen of
onboarding, in the FAQ, and on the Backup page: the record lives in one
browser on one device, clearing site data erases it, and an exported
file is the only copy that survives either.

### Verification

Tests 233 -> 259 (24 browser repository tests, 16 persistence engine
tests, 1 version-drift guard; 2 SQLite persistence suites removed).
Format, lint, typecheck and the static build all clean.

Two encoding defects were found and repaired in passing:
`lib/api/analytics.ts` and this file both carried double-encoded UTF-8
in comments and prose.

### Not done

- **Verification on a real phone.** The build and engines are verified
  locally; installing from a published link on iOS and Android is not.
- **A published link.** `.github/workflows/deploy.yml` exists and is
  correct on paper, but nothing has been pushed to GitHub, so it has
  never run.

## Adapter test coverage - Tier 1

The gap named at the end of Phase 9: 259 tests, none of them above the
repository layer. `lib/api/*` - the layer that turns engine results into
what the screens actually render - had no coverage at all, and it is
where the most damaging defect in PHOS's history lived. `workloadCategory`
was missing from a DTO while three adapters filtered on it; every
scheduled page fell into Revision, the Session card was permanently
empty, and every engine test and type check passed.

### What was added

60 tests in `tests/unit/api-adapters/`, over the five untested adapters:

| File           | Covers                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `dashboard.ts` | session/revision scoping, the withheld health scores, the weekly strip, explanation pass-through, the study budget |
| `analytics.ts` | range mapping, averages over the right subset, empty-history guards, timeline order                                |
| `history.ts`   | every filter, combined filters, filtered `totalCount`                                                              |
| `settings.ts`  | preference mapping, study-budget fallbacks, mutable roadmap arrays                                                 |
| `backup.ts`    | status thresholds, newest-first ordering, KB/MB formatting                                                         |

The engine DTO builders live in `tests/support/adapterFixtures.ts`, so a
test states only the field it is about.

### Verified against real defects

Seven defects were injected into the adapters and the suite re-run.
All seven were caught, by ten specific tests:

1. New-memorization filter inverted (the original bug) - 3 failures
2. Health scores no longer withheld without evidence - 1
3. `revisionQueue` narrowed to the single assignment - 1
4. Session duration averaged over abandoned sessions too - 1
5. `totalCount` taken before filtering - 2
6. Zero-minute study budget no longer falling back - 1
7. Backup history no longer sorted newest-first - 1

The adapters were then restored and the full suite re-run clean.

### Verification

Tests 259 -> 309. Format, lint, typecheck and the static build all clean.

### Still not covered

React components, hooks and the multi-step wizards (onboarding, import,
restore) - Tiers 2 and 3 of the proposed plan, not requested. The
`--passWithNoTests` flag on `npm run test:ui` means that suite reports
success while asserting nothing; this is stated in the README rather
than left to be discovered.

## Component test coverage - Tier 2

60 tests in `tests/ui/`, over the components where a defect costs data
or strands the user rather than looking wrong. They found **three
defects that had shipped** - each past every engine test, every type
check, and a manual walkthrough in which the product owner said
everything looked fine.

### Defect 1 - the typed DELETE confirmation could never be completed

`DialogContent`'s focus effect listed `setOpen` in its dependencies.
`setOpen` is rebuilt on every render of `Dialog`, and callers pass an
inline arrow as `onOpenChange`, so the effect re-ran on _every_ render -
including the one caused by typing a single character into the dialog's
own input. Its cleanup restored focus to whatever opened the dialog and
its body re-focused the panel, so focus left the field after the first
keystroke.

The field could therefore never hold more than one character, the
confirm button could never enable, and **Delete All Data was
unreachable**. Fixed by reading `setOpen` through a ref and depending on
`open` alone - which is what "focus moves in on open, returns on close"
always meant.

### Defect 2 - the number stepper turned 45 into 545

Clearing the field made `Number("")` zero, which clamped straight up to
`min`. A user replacing 30 minutes with 45 watched the box snap to 5,
typed into it, and ended with **545 minutes** - a nine-hour daily study
budget, inside the allowed range, so no validation complained. The same
trap caught any value whose first digit is below `min`.

Fixed with a draft value held while the field is being edited: bounds
now apply on blur, so intermediate digits survive. The stepper buttons
still clamp immediately, since they cannot produce an intermediate.

### Defect 3 - the onboarding preview was never on screen

The "What PHOS will record from your answers" panel is rendered on the
order step but was _fetched_ on the final step. On a first pass through
the wizard it was always empty; it appeared only if the user continued
to "Ready" and then pressed Back.

That panel exists specifically because the outcome surprises people - a
user choosing "Juz 30 first" with 75 memorized pages is told their next
new page is 53. The explanation was invisible to everyone who did not
navigate backwards. Fixed by fetching on the step that displays it, with
a named `ORDER_STEP` so the two cannot drift apart again.

### What is covered

| File                           | Tests | Subject                                                      |
| ------------------------------ | ----- | ------------------------------------------------------------ |
| `dialog.test.tsx`              | 8     | modal semantics, focus trap, Escape, focus return, backdrop  |
| `confirmation-dialog.test.tsx` | 8     | typed-phrase gating, case sensitivity, reopening unarmed     |
| `danger-zone.test.tsx`         | 6     | reset vs delete, exact outcome counts, failure keeps data    |
| `restore-wizard.test.tsx`      | 7     | correct backup id, safety copy, cache clearing, failure path |
| `import-wizard.test.tsx`       | 6     | a rejected file changes nothing, every error listed          |
| `study-inputs.test.tsx`        | 14    | stepper bounds and drafts, weak-page flagging                |
| `onboarding-wizard.test.tsx`   | 11    | step flow, level defaults, preview, saving every answer      |

`@testing-library/user-event` was added, and `types/jest-dom.d.ts`
registers jest-dom's matchers with `tsc` - `jest.setup.js` is plain
JavaScript, so the UI tests ran green while typecheck reported every
matcher as missing.

### Verified against the defects themselves

All three fixes were reverted and the suite re-run: 12 tests failed
across 4 files, then passed again once restored. Each test also failed
before its fix existed, which is how the defects were found.

### Verification

Vitest 309, Jest 60. Format, lint, typecheck and the static build clean.

### Still not covered

Presentational components, the data-fetching hooks, and whole-page
render smoke tests - Tier 3 of the proposed plan, not requested.

## Page coverage - Tier 3

40 tests in `tests/ui/page-states.test.tsx` and
`tests/ui/page-settings-backup.test.tsx`, covering all eight screens.

Every PHOS page answers the same four questions before rendering: is it
still loading, did it fail, is there nothing to show, or is there work
to do. Those branches are where a page crashes on undefined data, or -
worse - shows an empty state to a user with plenty of history because a
read quietly failed. Each of the five data-driven pages is now tested
through all four, plus Backup, Settings and About.

### Two accessibility gaps found and closed

**The history search box had no accessible name.** It had a placeholder
and a decorative magnifier marked `aria-hidden`, so a screen reader
announced an unlabelled text box with nothing to say what it searched.
A placeholder is not a name - it disappears as soon as the user types.
Given `type="search"` and an explicit `aria-label`.

**The tab strips were not tabs.** `TabsList`/`TabsTrigger`/`TabsContent`
rendered plain `div`s and `button`s with no ARIA roles, so the Analytics
and History tabs were announced as an anonymous row of buttons with no
indication of what they selected or which was active. The same gap that
was closed for `Dialog` in Phase 7 and missed here. Given `tablist`,
`tab` with `aria-selected`, and `tabpanel` wired together by id.

### A vacuous test, caught by the verification pass

The Analytics empty-state test asserted
`queryByRole("tab", { name: "Overview" })` was absent - but since
`TabsTrigger` had no `role="tab"`, that query returned null whatever the
page rendered. The assertion could never fail.

It surfaced only because the injected-defect pass expected four failures
and got three. Fixing the tab roles gave the assertion something real to
bind to, and a second assertion on the page heading was added so it does
not depend on roles alone. **A test that cannot fail is worse than no
test**, because it reports safety that does not exist.

### Verified against injected defects

Four defects were injected and all four caught:

1. The Dashboard error state losing its retry button - user stranded
2. Settings rendering its controls, and the Danger Zone, before settings
   had loaded
3. Analytics rendering a wall of zeros instead of its empty state
4. The search field losing its accessible name again

### An incident during that pass

The defect-injection backup keyed files by basename, and Dashboard,
Analytics and Settings are all `page.tsx` - so the three backups
overwrote each other and restoring put the Analytics page into
`app/dashboard/page.tsx`. Caught immediately by inspecting the restored
files rather than trusting the restore. `app/dashboard/page.tsx` was
rewritten from source read earlier in the session and re-verified
against its tests and the build output (12.2 kB, unchanged). One
cosmetic difference remains: a box-drawing comment banner is now a plain
comment block.

Any future defect-injection pass must key backups by full path.

### Verification

Vitest 309, Jest 100. Format, lint, typecheck and the static build clean.

---

# Phases 10–12 — goals, exams, and a traditional revision cycle

Shipped together as **v0.2.0** on 2026-08-05. Developed as one unit
because they share a database version bump and were never released
separately.

## Phase 10 — the user's own goal

A target the user sets, and where their real pace is heading.

**Chosen as a Juz, stored as pages.** Nobody plans Hifz in page counts,
and "through Juz 5" means 124 pages for somebody memorizing Juz 30
first and 101 for somebody going straight through. The picker lists Juz
in the user's own order and shows the conversion rather than hiding it.

**Three honesty rules, enforced in code rather than copy.** Pace comes
from `firstStudiedAt` — never the onboarding estimate, which is the
thing evidence is meant to replace. Nothing is projected below seven
days of history, because two good days would promise the whole Mushaf
inside a year. "Don't know" and "zero" are different answers, and a
paused month gets the first.

Where the pace lands late the card says so without alarm, and adds that
memorizing faster is not automatically right — without that line, a
goal card quietly reverses the application's central principle.

### The defect Qusai found: 582, 585, 588, 591

Seeded revision was staggered with `index % cycleDays`. The daily load
was correct and the arrangement was not: Hifz is recited continuously.
Changed to contiguous blocks — 582–589, 590–597, 598–604.

Four existing stagger tests passed throughout, because every one of
them measured _how many_ pages fell on each day and none measured
_which_.

## Phase 11 — exams

A fixed eight-stage ladder, on its own route at `/exams`.

**A stage unlocks on memorization, not permission.** The run-up revises
the pages in scope, and a page never memorized cannot be revised, so
booking one would produce a schedule that silently omits part of the
syllabus. Locked stages state the distance in pages rather than just
refusing.

**Equal division, not priority order.** Everywhere else PHOS schedules
by need. An exam inverts the requirement — the student is examined on
the whole scope, and a priority queue makes no promise of reaching the
end of itself.

**Two product decisions Qusai settled**, both easy to undo by accident
and both pinned by tests:

- Weak and Recovery pages outside the scope are not surfaced during the
  run-up. A student a week from an exam cannot act on "eleven other
  pages are slipping". They are reported once it is over.
- An oversized day is warned about and scheduled in full. **This is the
  only place PHOS suspends the Adaptive Engine's "never exceed
  available time" contract**, and it is suspended loudly, in three
  places, because both the date and the syllabus are fixed by somebody
  other than PHOS.

### Two defects found by using it

- **A passed Self Exam vanished.** `past` was computed in the
  operation, mapped through the DTO, formatted in the adapter — and
  never rendered by any component. Nothing in the type system or the
  tests could see it.
- **Exams passed before PHOS existed had nowhere to go.** Raised as a
  question, not a bug. Added to onboarding as per-stage checkboxes and
  to `/exams` as "Add a past exam" with an optional date. Recording one
  never unlocks a stage and never triggers the fallen-behind report —
  PHOS ran no preparation for it, so it set nothing aside.

## Phase 12 — the traditional revision cycle

An optional fixed rotation through everything memorized, in the user's
own order, repeating — the Manzil pattern most institutions teach.

Requirement 9 settles which is better: PHOS recommends, the user
decides. The recommendation is stated once, plainly, and then the
choice is left alone — no warnings, no nudges.

**Only revision changes.** New memorization keeps its pacing, its
observed daily target and its roadmap order. **Position comes from a
stored start date**, so missing days leaves the user where the rotation
actually is rather than restarting it. An exam takes precedence over
both.

A real bug caught here: `updateRevisionMode` re-stamped `cycleStartedAt`
every time the user switched _back_ to the cycle, so glancing at the
other option silently restarted their teacher's rotation. The doc
comment said it would not; the code did.

## The device migration

The blocked-seeding fix could not reach anyone already carrying the old
dates, and by this point PHOS had users beyond Qusai. Asking people to
delete their Hifz was not an option.

`MemoryEngine.reblockSeededRevision()` recomputes nothing. It sorts the
review dates already stored and re-pairs them with the pages in
memorization order. The multiset of dates is untouched, so **the number
of pages due on any given day is arithmetically identical before and
after** — only which page carries which changes.

That property is what made it safe to run unattended. Recomputing would
have needed the original cycle length, the number of seeding batches
and the start-immediately setting, all unrecoverable after the fact.

It refuses to touch any page with a recall event, moves all three
timestamps together, records that it ran, does _not_ mark itself done
if it failed, and can never stop the application opening.

## Also in this release

- **Exam-wise memorization order**: Juz 30 → 26, then 1 → 25. The last
  five descend so each of the first three exam stages completes as
  early as possible.
- **Exams moved to their own route**, with sidebar and bottom-bar
  entries. The bottom bar was rebuilt for six items — the previous
  fixed minimum width would have overflowed a 360px screen.
- **`resetAllData()` now deletes exams.** Missed when the store was
  added; a scheduled exam would have survived a full wipe.
- Database version 1 → 2, service worker cache `phos-v3`.

## Final gate

494 Vitest + 166 Jest (from 203 at v0.1.0). Format, lint, typecheck,
build and the base-path check all clean.

**Defect injection across the three phases: 23 defects injected, 23
caught** — but three of those only after a test was strengthened,
because the original assertion could not have failed. One of them was
the _same_ vacuous-test mistake made in Phase 7: an assertion that
picked a case identical before and after.

Every defect that reached a user was found by Qusai opening the
application. None was reachable from the tests.

---

# After v0.2.0 — defects found in use

## The Dashboard's primary actions were dead

Reported: "click start session and go to revision, nothing happens."

Both cards rendered the action as a bare `<span>` whenever a session or
revision existed, and as a `<Link>` only when there was nothing to do —
so the button worked in exactly the case a user would not press it.

```tsx
asChild={!session}
{session ? <span>Start Session</span>      // no href, no handler
         : <Link href="/session">…</Link>}
```

Present since `ac593c9`, the first commit. It survived twelve phases and
a public release because both screens stay reachable from the sidebar:
the flow was never blocked, only the shortcut. Neither button had a
single test.

Fixed by making the action always a link and varying only the label. The
eight tests added assert the `href` rather than the label — a
label-based assertion passes happily against a dead span, which is
exactly how this hid.

## "Completed session" could not describe the session

Reported alongside it: Recent Activity and History said "Completed
session" for revision and new memorization alike, and never named the
pages.

`SessionStatistics` now carries `sessionType` and the page numbers,
both recovered from data the engines already held. Page ids resolve
through one map built per report rather than per session — a weekly
report covers many sessions and a lookup per item is the N+1 this layer
exists to avoid.

Entries read "Completed memorization · Pages 12–14". Runs collapse
because eight consecutive numbers is unreadable; gaps do not, because a
gap says the day was not one continuous stretch. One shared formatter
serves both screens, so a session cannot be described two ways. History
became searchable by page number as a side effect — "when did I last do
582?" is how the question actually gets asked.

Gate after both: 508 Vitest + 174 Jest. Five defects injected, five
caught.
