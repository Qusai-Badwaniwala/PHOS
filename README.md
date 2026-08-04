# PHOS — Personal Hifz Operating System

**Live at https://qusai-badwaniwala.github.io/PHOS/**

> Picking this project up after a gap, or opening it for the first
> time? Start with **[`docs/HANDOFF.md`](docs/HANDOFF.md)** — one page,
> covering the deployed state, how to run and ship it, and what is
> deliberately not done.

## What is this?

PHOS is a Personal Hifz Operating System: an offline-first,
local-first application designed to help one individual memorize and
retain the Quran using evidence-based scheduling while remaining
faithful to traditional Hifz methodology.

It is a static web app. You open a link, install it, and it runs
entirely on your own device — no account, no server, no sync, and no
internet connection needed after the first visit.

## Why does it exist?

The purpose of PHOS is **not** to build a beautiful website. The
purpose is to help the user memorize the Quran (Madinah/Misri Mushaf)
as effectively, efficiently, sustainably, and scientifically as
possible. The software exists to support Hifz; it is not the goal.

PHOS is **not** a Quran reader, a productivity app, a habit tracker, a
social platform, or an AI chatbot. It contains no gamification, no
streaks/XP/levels/badges, no social or competitive features, and it
never stores, renders, or displays Quran text or Mushaf images.

## Philosophy

1. Less administration. More memorization.
2. Automation replaces administration. Never effort.
3. The user should think about the Quran. Never about the software.
4. The interface should be calm. Not exciting.

---

## Where the data lives, and what that costs

Everything PHOS records is kept in the browser's IndexedDB, on the
device it was recorded on. Nothing is transmitted anywhere, because
there is nowhere to transmit it to.

The consequences are stated plainly here, in the app's guide, and on
the Backup page, because a promise of privacy that hides its cost is
not honest:

- A record does not follow the user to another browser, another device,
  or a private window. Moving between devices means exporting a file and
  importing it.
- Clearing the browser's site data erases it. PHOS calls
  `navigator.storage.persist()` so the browser will not evict it on its
  own, and installing the app makes that request more likely to be
  granted — but a deliberate "clear site data" always wins.
- **Export is the only copy that outlives the browser.** Backups are
  fast to take and restore, and are taken automatically before anything
  destructive, but they live in the same storage as the data they
  protect.

## Architecture at a glance

```
Presentation (app/**/page.tsx, components/, providers/)
        │
lib/api/*  — adapter: engine DTOs → presentation DTOs
        │
client/operations/*  — validate, call engines, map results
        │
client/container.ts  — the composition root
        │
Engines (engines/{learning,memory,adaptive,analytics,persistence})
        │
Repositories (repositories/interfaces → repositories/browser)
        │
IndexedDB (via idb)
```

- **Engines** own all business logic. Every engine has exactly one
  domain responsibility and exposes exactly one public entry point.
  They depend on repository _interfaces_ and are handed implementations
  by the container — which is the only reason PHOS could move from
  SQLite to IndexedDB in Phase 9 without changing a single engine or
  engine test.
- **Repositories** own all persistence. They never contain business
  logic.
- **`client/operations/*`** is what `app/api/v1/**/route.ts` used to be:
  the same validation, the same engine calls, the same mappers, minus
  the HTTP. See `client/operations/README.md` for the endpoint-by-
  endpoint account. Two narrow, documented exceptions (settings and
  roadmap) call a repository directly.
- **`lib/api/*.ts`** reshapes engine DTOs (`shared/dto`) into the
  frontend's presentation DTOs (`types/dto.ts`) — see
  `docs/merge-report.md` "Frontend/backend DTO boundary" for why two DTO
  vocabularies exist.
- Dependencies flow only downward. Circular dependencies and
  layer-skipping are prohibited.

## Tech stack

| Concern         | Choice                                                       |
| --------------- | ------------------------------------------------------------ |
| Framework       | Next.js 14 (App Router), static export                       |
| UI library      | React 18                                                     |
| Language        | TypeScript (strict mode)                                     |
| Styling         | Tailwind CSS (custom design system, no shadcn/Radix runtime) |
| Storage         | IndexedDB, via `idb`                                         |
| Tests           | Vitest (with `fake-indexeddb`) — 309 tests                   |
| Component tests | Jest + Testing Library + user-event — 100 tests              |
| Deployment      | Static files — GitHub Pages, or any static host              |

## Project structure

```
phos/
├── app/                    # Next.js App Router — pages only, no API
│   ├── dashboard/, session/, revision/, analytics/, history/,
│   │   settings/, backup/, about/
│   └── layout.tsx, manifest.ts, globals.css, error.tsx, ...
├── client/
│   ├── container.ts          # Composition root: repositories + engines
│   ├── operations/           # The former API routes, minus the HTTP
│   └── storage.ts            # navigator.storage.persist()
├── components/              # UI components (custom, no Radix)
├── providers/               # React context providers (theme, settings)
├── public/                  # Static assets, PWA icons, sw.js
├── engines/                 # One folder per domain engine
├── repositories/
│   ├── interfaces/           # What the engines depend on
│   └── browser/              # IndexedDB implementations
├── validators/              # Input validation
├── lib/
│   ├── api/                  # Engine DTOs → presentation DTOs
│   ├── hooks/                # React data-fetching hooks
│   └── constants/, logger/, format.ts, utils.ts
├── shared/
│   ├── types/, constants/, errors/, utils/
│   ├── dto/                  # DTOs crossing the engine boundary
│   └── mappers/              # Domain model → DTO
├── types/                   # Frontend presentation DTOs (types/dto.ts)
├── tests/
│   ├── unit/                 # Engine + repository tests (Vitest)
│   └── ui/, integration/     # Frontend tests (Jest)
├── scripts/generate-icons.mjs
├── .github/workflows/       # CI + GitHub Pages deploy
└── docs/                    # Documentation (see docs/README.md)
```

## Getting started

```bash
npm install
npm run dev
```

There is nothing else to set up — no `.env`, no database to create, no
migrations to run. The 604 pages of the Mushaf are seeded into
IndexedDB the first time the app opens.

To check what actually ships:

```bash
npm run build     # writes ./out
npm run preview   # serves ./out at http://localhost:3000
```

### Available scripts

| Script                  | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Start the Next.js development server           |
| `npm run build`         | Static production build into `out/`            |
| `npm run preview`       | Serve the built `out/` directory               |
| `npm run lint`          | Lint the codebase                              |
| `npm run format`        | Format the codebase with Prettier              |
| `npm run typecheck`     | Run the TypeScript compiler in check-only mode |
| `npm run test`          | Run engine/repository tests once (Vitest)      |
| `npm run test:watch`    | Same, watch mode                               |
| `npm run test:ui`       | Run frontend tests once (Jest)                 |
| `npm run test:ui:watch` | Frontend tests, watch mode                     |
| `npm run test:all`      | Run both test suites                           |
| `npm run icons`         | Regenerate PWA icons from the logo             |

## Publishing it

Push to `main`. `.github/workflows/deploy.yml` runs the same gates
(typecheck, lint, tests), builds, and publishes to GitHub Pages. The
only manual step is once, in the repository: **Settings → Pages → Source
→ GitHub Actions**.

The site then lives at `https://<owner>.github.io/<repository>/`, and
anyone who opens that link can install PHOS and start using it.

## Known gaps

Stated here rather than discovered later:

- **Component coverage is deliberately partial.** `tests/ui/` covers the
  places where a defect costs data or strands the user — the dialogs,
  the Danger Zone, the import and restore wizards, the study inputs, the
  onboarding wizard — plus every page's loading / error / empty / content
  branches. Individual presentational components and the data-fetching
  hooks are not covered; testing them would mostly test React.

  Between them, those 100 tests found three shipped defects and two
  accessibility gaps that had passed every engine test, every type check
  and a full manual walkthrough: an unsatisfiable typed confirmation, a
  number field that silently turned `45` into `545`, an onboarding
  preview never fetched while on screen, an unlabelled search box, and
  tab strips with no ARIA roles. See `docs/phase-progress.md` for each.

- **Never run on a phone.** The PWA install path is verified by reading
  the manifest and the built output, not by installing it on iOS or
  Android.
- **Two high-severity advisories** in `postcss`, reached through `next`.
  Both concern CSS parsing and source maps at build time; a static
  export ships no PostCSS to the browser. The fix is `next@16`, a major
  upgrade that has not been attempted.
- **The scheduling constants are engineering judgement.** The model is
  built on published memory research, but the specific decay rates and
  thresholds were chosen and sanity-checked, not validated against real
  Hifz outcome data. "Scientifically informed" is the honest phrase; it
  is not "clinically validated".

## Coding standards

- Strict TypeScript everywhere. Avoid `any`.
- Business logic belongs only inside Engines — never in UI components,
  pages, hooks, operations, or repositories.
- Engines depend on repository interfaces, never on a concrete
  repository, and never construct one.
- Names must explain intent.
- Formatting is automated via Prettier; linting via ESLint (flat
  config, `eslint.config.mjs`) — both wired into CI.

## Documentation

Start with **[`docs/README.md`](docs/README.md)** for the full
documentation index, or go straight to:

- **[`docs/phase-9-static-pwa-plan.md`](docs/phase-9-static-pwa-plan.md)** —
  why and how PHOS moved into the browser.
- **[`docs/merge-report.md`](docs/merge-report.md)** — how the frontend
  and backend repositories were originally integrated.
- **[`docs/integration-review.md`](docs/integration-review.md)** — the
  backend's own build audit, from when there was a backend.
- **[`docs/onboarding.md`](docs/onboarding.md)** — new-contributor
  starting point.
