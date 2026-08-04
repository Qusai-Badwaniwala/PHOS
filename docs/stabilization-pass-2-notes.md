# PHOS — Stabilization Pass (in progress, handed off to Claude Code)

This pass investigated `Possible_issues.txt` + `Issues_SS.zip` against the
Release Candidate Master Prompt. Below is what was found, fixed, and
verified in this pass, and what remains — written for continuation in
Claude Code, which has no memory of the conversation that produced this.

## Fixed and verified in this pass (tsc --strict clean)

1. **Session/Revision never called the real backend.** `onStart`/
   `onComplete` in `app/session/page.tsx` and `app/revision/page.tsx`
   only set local React state — no `Session` row, `RecallEvent`, or
   Page memory-state update was ever created. This is the root cause
   of: revision showing the same 60 pages after "completing" and
   revisiting (nothing was ever persisted, so the Adaptive Engine
   correctly re-schedules the same never-reviewed pages), and weekly
   progress never updating. Fixed: `lib/api/session.ts` and
   `lib/api/revision.ts` now have real `startSession()`/
   `completeSession()` (and `startRevision()`/`completeRevision()`)
   that call `/session/start`, submit a real recall+confidence for
   every page in the assignment, then call `/session/finish`. Wired to
   the actual buttons in both pages. Active session/revision state is
   also stored in `localStorage` so **reloading mid-session now
   correctly shows "in progress"** instead of resetting (this answers
   the "what if I reload mid-session" question directly).
2. **Weekly progress / chart dates used the report's generation time
   for every entry**, not each session's own date — so a session
   completed today could show up under the wrong day. Root cause: the
   backend's `SessionStatistics` never exposed a per-session date at
   all. Fixed at the source: added `startedAt` to
   `shared/types/analytics.ts` → `SessionStatisticsCalculator.ts` →
   the API DTO → the mapper, then fixed `lib/api/dashboard.ts`,
   `analytics.ts`, and `history.ts` to bucket/sort by each session's
   real date. `history.ts`'s previously-unimplemented `dateFrom`/
   `dateTo` filters now actually work too.
3. Confirmed `lib/api/index.ts` barrel still matches actual exports
   after the above rewrite (would otherwise have been a real, silent
   build-breaking bug).

## Investigated, not a code bug (documented, not silently dismissed)

**"Revision already shows 60 pages before I've done anything."**
Traced `categorizePage()` (Adaptive Engine) end to end: a genuinely
never-reviewed page is _unconditionally_ categorized `NewMemorization`
on its very first check — there is no path in the current code for an
`Unseen` page to become a revision category. The 60 pages shown as
"Sabqi — Recent Revision" must therefore already be in a
post-`Unseen` state, meaning real recall history already exists for
them in the database. Given no button anywhere in any version of this
app (including before this pass's fix) ever actually called the
backend recall endpoints, this can't have been caused by clicking
through the old broken UI. **Most likely explanation: the SQLite
database file has carried state across earlier testing rounds/zip
re-extractions** (nothing has ever instructed deleting
`database/phos.db` between rounds). Recommended verification: delete
`database/phos.db` (and `.db-journal`) and re-run `npm run db:migrate`
for a truly clean database, then re-check the dashboard. If 60 pages
still show as revision-category on a _confirmed-fresh_ database, that
would be a real, currently-undiscovered bug worth a fresh investigation.

## Not yet done — for Claude Code to continue

1. **`SessionControls`/`RevisionControls` have no disabled/pending
   prop.** The page-level `handleStart`/`handleComplete` now do real
   async work but can't currently disable the buttons or show a
   pending spinner during that work (double-click during an in-flight
   request is currently possible). Add a `disabled`/`pending` prop to
   both components and wire it from the pages.
2. **Backup Import/Export is still not wired.** `app/api/v1/backup/export/route.ts`
   exists (returns real exported JSON), but:
   - `app/api/v1/backup/import/route.ts` does not exist yet — needs to
     accept uploaded JSON content, write it to a temp file, call
     `container.persistenceEngine.importData(tempPath)`, clean up the
     temp file, and return the result.
   - `lib/api/backup.ts` needs real `exportData()`/`importData(file:
File)` functions calling those routes.
   - `components/backup/export-wizard.tsx` and `import-wizard.tsx` are
     still pure static placeholders — wire the Export button to
     trigger a real download (Blob + `<a download>`), and replace the
     fake "Browse" button with a real `<input type="file" accept=".json">`.
3. **About page** — user asked for more substantive content; not yet
   touched this pass.
4. **PWA** — `public/` has no manifest.json or icons at all (a
   pre-existing gap, documented since the original merge, still open).
5. **Broader production-readiness audit** the Master Prompt asks for
   (accessibility pass, loading/error state consistency review across
   all pages, full `npm run build`/`test:all` execution) — not
   performed this pass; this pass was scoped to the reported
   functional bugs plus the barrel/date fixes needed to keep the
   codebase internally consistent.

## Verification performed this pass

- `tsc --strict` clean on every `lib/api/*.ts` file (framework-agnostic,
  checked via isolated stubs — see `docs/integration-review.md` for why
  this environment can't run a real `npm install`).
- `tsc --strict` clean on the entire backend (`engines/`,
  `repositories/`, `shared/`, `validators/`, `server/`, `app/api/`, all
  backend tests) with the new `SessionStatistics.startedAt` field.
- **Not verified**: `app/session/page.tsx`/`app/revision/page.tsx`
  themselves under a real TSX/React compile (this sandbox's React stub
  was insufficiently complete to check JSX files this round — same
  limitation noted in `docs/merge-report.md`). They were reviewed
  manually instead; the edits are small, additive, and follow the
  exact pattern already used elsewhere in the same files.
