# Phase 9 — Static PWA Migration

**Status: built.** This document is kept as written — the plan as it was
approved — with an outcome section at the end recording what was built,
what was decided differently, and what is left.

## The goal, in the product owner's words

> Upload it, get a link, share it. Anyone opens the link, installs it,
> and PHOS is running — their data on their own device, no login, no
> npm, no technical knowledge. One PHOS per person.

## Why this is the right architecture for PHOS

It is what the product has claimed since the first line of the guide.
Today the guide says "your memorization belongs to you — not to
advertisers, analytics companies, or external servers" while the data
actually lives in a server process that has to be running. After this
migration that sentence becomes literally true rather than
approximately true, and PHOS stops needing a machine to be switched on.

It also removes the single biggest barrier to anyone using it: there is
currently no way to give PHOS to a person who does not have Node
installed.

## The blocker

PHOS stores data in **server-side SQLite via Prisma**, reached over
`/api/v1/*`. GitHub Pages serves static files only — no Node process, no
SQLite. The data layer has to move into the browser.

## What makes this feasible rather than a rewrite

The SDS's dependency injection is the reason this is a migration and not
a restart. The five engines depend on **interfaces**
(`IPageRepository`, `ISessionRepository`, …) and the container supplies
the implementations. So:

- **The engines do not change.** Memory, Adaptive, Learning, Analytics
  logic is untouched.
- **The repository interfaces do not change.** Only the six
  implementations behind them.
- **The ~215 engine tests keep passing**, because they test against
  fakes, not Prisma.

There is also a telling piece of history: the original frontend repo
had `output: "export"`, and Phase 0 removed it _because_ it broke the
API routes. Remove the API routes and static export becomes correct
again. This returns PHOS to the shape it was first built in.

## Scope

### 1. Repositories → IndexedDB _(the bulk of the work)_

Reimplement six repositories against IndexedDB behind the existing
interfaces:

`PageRepository`, `SessionRepository`, `RecallEventRepository`,
`SettingsRepository`, `RoadmapRepository`, `BackupRepository`

Recommend a thin wrapper (`idb`) over raw IndexedDB. **Not**
SQLite-WASM: it would preserve the SQL, but the repositories are the
only SQL-aware code in the app and they are small, so the WASM payload
and OPFS persistence juggling buy little.

Indexes to carry over from `schema.prisma`: `Page.pageNumber` (unique),
`Page.memoryState`, `Page.juzNumber`, `RecallEvent.pageId`,
`RecallEvent.timestamp`, `Session.startedAt`.

### 2. Remove the HTTP layer

`lib/api/*` currently `fetch()`es `/api/v1/*`. It would call the engines
directly through the container. **The DTOs and mappers stay** — they are
the presentation contract and are worth keeping. `app/api/**` is
deleted.

This also removes a whole class of latency: no serialization, no
network round trip per page during session completion.

### 3. Container moves to the browser

`server/container.ts` becomes a client module, instantiated once.
`LearningEngine`'s in-memory session state becomes genuinely
per-tab — acceptable, since `findActiveSession()` already rebuilds from
persisted rows (Phase 2).

### 4. Persistence Engine reworked

Currently writes `.db` files with `node:fs`. In the browser:

- **Backup** → a JSON snapshot of every store, held in IndexedDB
- **Restore** → replace all stores from a snapshot
- **Export** → download a `.json` file (already this shape)
- **Import** → file upload (already this shape)

Checksums and manifest verification carry over unchanged; only the
storage medium differs. **The backup-before-delete guarantee must
survive** — it is the safety net under the Danger Zone.

### 5. Storage durability

- Call `navigator.storage.persist()` on first run so the browser will
  not evict PHOS under storage pressure. Installed PWAs are typically
  granted this automatically.
- On iOS this matters most: Safari clears data for ordinary sites after
  ~7 days of inactivity, but **home-screen-installed web apps are
  exempt**. Installing is not cosmetic there.
- Optional desktop extra: `showDirectoryPicker()` to keep a copy in a
  user-chosen folder. Chrome/Edge desktop only — **not** available on
  Android Chrome or iOS Safari, so it can never be the primary store.

### 6. First-run seeding

The 604 pages currently come from `prisma/seed.ts`. In the browser they
are seeded on first launch, before onboarding.

### 7. Build and deploy

- Restore `output: "export"`
- A GitHub Actions workflow publishing to Pages
- `basePath` set if served from a project subpath rather than a custom
  domain

## What the guide must then say

Two new truths, both of which belong in the FAQ:

1. **Data is per-device.** Phone and laptop are independent PHOS
   instances with no sync. Export/import is the bridge. This follows
   directly from "no accounts", and is a tradeoff, not a defect.
2. **Clearing site data erases it.** Persistent storage makes eviction
   very unlikely, but a deliberate clear still wipes it. Exporting
   occasionally should be encouraged in-app, not just documented.

The privacy section gets _stronger_ and should be rewritten to say so.

## What this does not give you

- **No sync between your own devices.** Would require a server, which
  is the thing being removed.
- **No sharing progress with a teacher.** Export/import only.
- **No recovery if the device is lost**, unless the user exported.

Each is inherent to the model, not a gap to fill later.

## Risk and sequencing

The dangerous part is the data layer, and the mitigation is that the
engines and their tests are untouched — a regression will surface in the
repositories, which is exactly where new tests should go.

Suggested order:

1. IndexedDB repositories + tests, behind the existing interfaces, with
   the server still running (both implementations coexist, chosen by the
   container)
2. Persistence Engine rework
3. Cut over `lib/api/*` to direct engine calls; delete `app/api/**`
4. Static export + Pages workflow
5. Storage persistence + install prompt polish
6. Full release audit again, on a real phone

Steps 1–2 are reversible. Step 3 is the point of no return.

## Estimate

Comparable to Phases 4–6 combined. Not a rewrite, but every repository
and the whole data path changes, and all of it needs re-verifying on a
real device.

---

# Outcome

## What was built

Everything in Scope, in the suggested order.

| Plan                        | Where it landed                                                     |
| --------------------------- | ------------------------------------------------------------------- |
| Six IndexedDB repositories  | `repositories/browser/`                                             |
| Persistence Engine reworked | `engines/persistence/browser/`                                      |
| Container in the browser    | `client/container.ts`                                               |
| HTTP layer removed          | `client/operations/` (see its `README.md`); `app/api/**` deleted    |
| Storage durability          | `client/storage.ts`, surfaced on the Backup page                    |
| First-run seeding           | inside `getDatabase()` — see below                                  |
| Build and deploy            | `output: "export"`, `.github/workflows/deploy.yml`                  |
| Guide rewritten             | `components/about/guide-content.ts`, onboarding step 4, Backup page |

The prediction that made this feasible held exactly: **no engine and no
engine test changed.** The engines' 215 tests passed against IndexedDB
on the first run, having been written against SQLite.

## Decisions that differ from the plan

**The whole Prisma stack was deleted, not left dormant.** The plan said
"both implementations coexist, chosen by the container" for steps 1–2,
and they did. But shipping both would have meant two definitions of
"your data is safe" with only one of them reachable, and a reader could
not tell which. Deleted: `app/api/**`, `server/`, `prisma/`, the six
Prisma repositories, `lib/prisma.ts`, `lib/config/env.ts`, and the
SQLite `PersistenceEngine`. The local database was exported to
`database/exports/` first, so the data collected while testing could be
imported into the browser build.

**Seeding happens inside `getDatabase()`, not "on first launch".** A
launch-time seed leaves a window in which a repository can read an empty
Mushaf and truthfully report that the user has nothing to study. Making
it part of opening the connection removes the window entirely; the
promise is cached, so it runs once no matter how many engines start at
once.

**The Phase 3 backup defect was designed out rather than fixed.** In the
SQL build, backup history lived inside the database a restore
overwrote, so restoring rewound the list of backups and the safety copy
taken seconds earlier vanished — patched then with filesystem
reconciliation. `writeSnapshot()` now excludes the `backups` store, so a
restore cannot touch backup history at all. Two tests assert this, and
both were confirmed to fail when the old behaviour was temporarily
restored.

**`showDirectoryPicker()` was not built.** Listed as an optional extra;
it is Chrome/Edge desktop only, so it would be a second, unequal
backup path that most users never see. Export to a file already answers
the same need everywhere.

**`runMigration()` was dropped from the browser engine** rather than
implemented as a no-op. IndexedDB upgrades run inside `openDB`'s
`upgrade` callback the moment the database is opened; there is no such
thing as a pending migration to apply later.

## What the service worker now claims

Its old doc comment carefully explained that caching the shell could not
make PHOS usable, because the data lived behind a server. That is no
longer true, so the file says the strong thing instead: PHOS works with
no network at all. Navigations are network-first with a cache fallback,
and every route is precached at install so the _first_ offline launch
works, not only the second.

## Still to do

- **Verification on a real phone.** Step 6 of the sequencing. The build
  and the engines are verified locally; installing from the published
  link on iOS and Android is not.
- **A published link.** The deploy workflow exists and is correct on
  paper; nothing has been pushed to GitHub yet, so it has never run.
