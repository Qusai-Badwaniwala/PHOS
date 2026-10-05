# PHOS — start here

Read this file before changing PHOS. For the approved experience and implementation
boundaries, read [REIMAGINED.md](REIMAGINED.md). For observed checks and remaining
release boundaries, read [VERIFICATION.md](VERIFICATION.md).

## Official working app and recoverable baseline

The owner adopted the complete **v0.4.0** frontend on 2026-10-05 and subsequently
authorized its commit, push and GitHub Pages release. Development used
the isolated `codex/phos-reimagined` worktree based on `d3fe97b`; the validated
implementation is also adopted into the main project working tree. The previous
implementation remains recoverable at `d3fe97b`. Release evidence is recorded in
`VERIFICATION.md`; do not claim deployment until the workflow and live app agree.

On this machine:

- Main app: `C:/Users/qusai/OneDrive/Desktop/PHOS-Claude/phos-handoff/phos-integrated`
- Isolated implementation: `C:/Users/qusai/OneDrive/Desktop/PHOS-Claude/phos-reimagined`
- Production-build preview: `http://127.0.0.1:4341/`

The public app address is `https://qusai-badwaniwala.github.io/PHOS/`.
The owner requested publishing the redesign first, then investigating shared-origin
storage, adding a full return-to-onboarding reset and auditing the application's
logic. That request supersedes the earlier hold on commits and deployment.

## The product

PHOS is Qusai's Personal Hifz Operating System. It plans memorization and retention
for a physical **604-page Madinah / Misri Mushaf**. It is a completed, local-only PWA,
not a prototype, a Quran reader, a habit game, or a generic productivity dashboard.

Sabaq learns the next pages. Sabaqi revisits recent memorization. Manzil maintains
established pages. Recovery gives weak pages priority. Exams deliberately replace
ordinary revision with complete coverage of their scope. PHOS recommends; the user
may record outside study or explicitly choose extra Sabaq.

The five existing reminder ayahs are the deliberate reader-boundary exception:
one reminder is visible at a time, dwelling for eight seconds, fading out then in.
There is no next/previous navigation. This does not become a recitation surface.
Reduced motion holds one reminder still; hidden/offscreen reminders pause.

No accounts, server, synchronization, tracking, listening to recitation, Mushaf
images, streaks, XP, or silently added capabilities.

## Architecture and storage rules

```text
app + components + providers
  -> lib/api presentation adapters
  -> client/operations validation and orchestration
  -> client/container composition root
  -> learning / memory / adaptive / analytics / persistence engines
  -> repository interfaces and browser implementations
  -> IndexedDB
```

- Memory Engine owns memory calculations and transitions. Recall events remain
  append-only during ordinary study. No component performs memory arithmetic.
- Database version remains **2**, export format remains **1**. Application version
  is independent of the data format. Older compatible exports are not rejected
  because of their application version.
- There are 604 unique page records and one settings row. Additive fields have
  compatible absent-field behavior. Existing one-time repairs remain intact.
- `client/commit-study.ts` composes Memory Engine with transaction-bound repositories:
  memory update, recall append, and session item commit together. It does not replace
  any Memory Engine algorithm.
- One active session is enforced transactionally. Its saved assignment, weak flags,
  pause state, and recorded items survive reload. Completion is idempotent.
- Persistence may replace the record only for an explicit restore or reset. Validate
  first, verify a safety copy, then use one replacement transaction. The `backups`
  store is outside that replacement and survives it.
- File restore is a **full restore**, not a merge. Portable snapshots include pages,
  sessions, session items, recalls, settings, roadmap entries, and exams. Legacy
  files display warnings for information they never contained.
- Local restore points cannot survive clearing site data. An exported file kept
  elsewhere can. Persistent storage is requested, not guaranteed by PHOS.

## Frontend authority

A quiet study folio, independently designed without a prescriptive design skill.
Mineral ivory and ink-plum themes share restrained rose accents. Locally served
Source Sans 3, Source Serif 4, and Noto Naskh Arabic. The existing book/arch identity
and quiet author attribution remain.

Phone destinations: **Today, My Hifz, Exams, More**. Original routes remain valid.
Study has a focused layout and reachable fixed actions; desktop uses a deliberate
rail and bounded reading/work columns. Preserve every capability, including the
full custom roadmap, paused Juz, optional goals, traditional revision, all exam
forms, outside work, history views, preferences, export, restore, and reset.

Motion communicates cause and continuity: short page settling, restrained sheets,
press feedback, and sequential reminder fades. Native scrolling remains native.
Respect both the operating system and the in-app reduced-motion preference.

## Run and validate

Use Node **24**, matching `.nvmrc`, and npm 11.

```bash
npm install
npm run dev
npm run build
npm run preview
npm run gate
```

`gate` checks formatting, lint, TypeScript, Vitest, Jest, static export, and the
complete offline resource manifest. Test the production export in a real browser;
`next dev` does not exercise the production service worker. Use a new port for a
fresh database instead of clearing someone's record.

For deployment-path verification:

```bash
PHOS_BASE_PATH=/PHOS npm run build
PHOS_BASE_PATH=/PHOS node scripts/verify-base-path.mjs
```

PowerShell: set `$env:PHOS_BASE_PATH = '/PHOS'`, run the two commands, then remove
that environment variable and rebuild for a root preview.

Next 16's version-matched documentation is bundled in `node_modules/next/dist/docs`.
Read the relevant guide before changing framework behavior. The production build
uses Webpack explicitly. No runtime environment secrets or database URL are needed.

## PWA release behavior

The build creates `out/precache-manifest.js` from every exported application file,
including all routes, route payloads, JavaScript, CSS, icons, and three local fonts.
`verify-precache.mjs` validates the artifact. The worker's cache key includes its
scope and a content-derived build identifier. Installation is atomic; errors never
become cached app pages. Activation cleans only PHOS caches for this scope and keeps
one prior build for already-open tabs.

New workers wait. Check on launch, foreground return, restored connection and every
ten minutes while visible. Apply update checks the live active session before activation.
An open study blocks the update and offers Resume. Only the tab requesting the
update reloads. Apply/Later and offline-setup retry are explicit user actions.

CI and Pages deploy run frontend tests and offline artifact checks as well as
engine tests. The owner authorized commit/push/deployment on 2026-10-05. Keep local
records and the recoverable prior implementation intact throughout publication.

## Verification boundaries

See [VERIFICATION.md](VERIFICATION.md) for actual evidence, not historical counts.
Desktop phone emulation cannot establish physical Android/iOS installation, launcher
appearance, TalkBack/VoiceOver, real-device latency, or Safari-specific keyboard behavior.
The scheduling coefficients are scientifically informed engineering judgement, not
validated against a Hifz outcome study.

Production dependency audit reports zero known vulnerabilities. Five high advisories
remain in the developer ESLint glob chain (`braces` through Next lint tooling); no
compatible patch was offered. That chain does not ship in the static browser app.
Do not use an unsafe forced downgrade to make the audit count look better.

Historical build decisions and defects remain in [phase-progress.md](phase-progress.md)
and the phase documents. Their old framework versions, phase tasks, and test counts
are history, not current instructions.
