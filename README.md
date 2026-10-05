# PHOS — Personal Hifz Operating System

A local-first phone PWA for Quran memorization and retention with a physical
604-page Madinah / Misri Mushaf. PHOS plans Sabaq, Sabaqi, Manzil, recovery, and exam
preparation, and keeps progress entirely in the browser.

**The owner adopted the v0.4.0 redesign as the official frontend and authorized its
GitHub Pages release on 2026-10-05.** The v0.3.0 implementation
remains recoverable at `d3fe97b`. Development was isolated on `codex/phos-reimagined`.

Start with [docs/HANDOFF.md](docs/HANDOFF.md), then
[docs/REIMAGINED.md](docs/REIMAGINED.md) and
[docs/VERIFICATION.md](docs/VERIFICATION.md).

## The experience

Today brings the next assignment into focus. My Hifz holds the overview, trends,
and study history. Exams contains the fixed ladder, self exams, past exams, and
complete run-up coverage. More holds settings, record protection, and the guide.

Both themes are designed as a quiet study folio. Focused study saves its assignment,
weak-page flags, pause state, and completion receipt. Five reminder ayahs change by
automatic sequential fades; there are no carousel navigation controls. Reduced
motion holds the reminder still.

This is not a Quran reader: use your own Mushaf and teacher for recitation. There
are no accounts, cloud sync, tracking, gamification, or social features.

## Your record

IndexedDB stores the record on this browser and device. Local restore points undo
mistakes but disappear when site data is cleared. **Keep an exported file elsewhere**
if you want a copy that outlives the browser or moves to another device.

Export contains all seven record stores. File import previews a **full restore**,
verifies a safety copy, and replaces the record atomically. Repeated restores do not
merge or duplicate history. Database version 2 and export format 1 remain compatible.

## Run it

Use Node 24 and npm 11, matching `.nvmrc`.

```bash
npm install
npm run dev
```

No `.env`, server, account, database URL, or migration command is required.
To exercise the production PWA:

```bash
npm run build
npm run preview
```

The build writes `out/` and generates the complete offline manifest. Development
mode does not register the production worker. A different localhost port gives a
fresh record without erasing an existing one.

## Check it

```bash
npm run gate
```

The gate runs Prettier, ESLint, TypeScript, engine/repository tests (Vitest), frontend
journey tests (Jest/Testing Library), the static build, and offline artifact verification.
See [the verification record](docs/VERIFICATION.md) for current results and browser evidence.

## Architecture

```text
Presentation -> lib/api adapters -> client/operations -> client/container
  -> Learning / Memory / Adaptive / Analytics / Persistence
  -> Repository interfaces -> Browser repositories -> IndexedDB
```

The Memory Engine remains the sole author of memory transitions. The transaction
composition boundary makes study writes atomic without replacing that logic.
Recall history is append-only during ordinary study. Restore/reset are explicit,
guarded replacement operations. Changes to the database must remain additive.

Next 16 static export, React 19, TypeScript, Tailwind 4, Radix accessible primitives,
Motion, `idb`, and local Source Sans 3 / Source Serif 4 / Noto Naskh Arabic fonts.
Only the font subsets used by the interface ship. No runtime font network requests.

## Adoption and remaining boundaries

Commit and publish only when the owner separately requests it. The existing GitHub Pages workflow
builds with the repository base path, verifies it, and publishes only from `main`.
The owner authorized deployment on 2026-10-05. New builds offer an in-app Apply
update / Later notice; an open study blocks activation and offers Resume instead.

Real Android/iOS installation, launcher icons, mobile screen readers, and device
latency still need physical-device validation. Production dependency audit: zero
known vulnerabilities. Five high developer-tool advisories remain in the ESLint
`braces` dependency chain; see the handoff. Scheduling coefficients remain
scientifically informed engineering judgement rather than outcome-validated claims.
