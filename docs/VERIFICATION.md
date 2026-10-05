# PHOS verification record — 2026-10-05

This records evidence for the official v0.4.0 working frontend, developed on
`codex/phos-reimagined` from `d3fe97b`. The owner authorized publication on
2026-10-05 after local adoption. Local checks do not establish physical-phone
acceptance; release evidence is added only after observing the actual deployment.

## Automated checks

`npm run gate` completed successfully in the adopted main project with the final
source. It includes format, ESLint, TypeScript, unit/repository tests, frontend tests,
static export and precache verification. There were no lint or type errors.

- Engine/repository suite: **612 tests in 55 files passed**.
- Frontend suite: **196 tests in 19 suites passed**. **808 tests total**.
- The update-notice regressions cover foreground/interval discovery, deferral,
  active-study protection, explicit activation, successive waiting releases and
  actual installation failure. Worker tests also verify incomplete-cache removal.
- Root and `/PHOS` static exports passed during implementation. The deployment-path
  verifier checked **15 HTML files**. The offline manifest included **121 resources**,
  about **3.76 MiB**, covering every route and route payload plus all JS/CSS/fonts/icons.
- Final root offline build identifier: `fadf600feb2e7623df88`.
- One harmless build-time Node warning remains: the Tailwind TypeScript config is
  reparsed as an ES module. This is tooling metadata, not a browser warning or build error.
- Production dependency audit: **0 known vulnerabilities**. Full developer audit:
  **5 high advisories**, all in the ESLint/Next glob chain through `braces`.
  No compatible patch was offered; forced downgrade was deliberately avoided.

Meaningful added regressions cover rollback and retry across memory/recall/session
items, one active session and idempotent completion, complete repeatable restore,
malformed file rejection before writes, atomic reset failure, ordinary daily new-page
allowance, serialized preferences, stale async read responses, paused-Juz goal count
and comparisons with an empty observation window. Daily allowance, empty trends,
printed-page surah spans and successive-update regressions were observed failing
before their corrections. All 114 chapter start pages matched the primary reference;
actual end pages now replace the assumption that every boundary overlaps.

Printed-page metadata source: [Quran.com chapter metadata](https://api.quran.com/api/v4/chapters?language=en).
This changes presentation labels, not stored progress or scheduling calculations.

## Real-browser journeys

Production static exports were used in the Codex in-app Chromium browser. Phone
checks used **390 × 844** and **320 × 740**; tablet/desktop checks are consolidated
below. All records used for these tests were created through the actual UI on
separate localhost origins. No IndexedDB injection was used to substitute a journey.

- Onboarding: all five steps, real Standard and Juz-30-first page previews,
  partially memorized and complete 604-page records, optional prior exam stages.
- Daily study: Sabaq completion; ordinary quota exhausted after actual new recall;
  voluntary extra study; zero-page partial close; revision with weak flags;
  pause, reload and exact assignment recovery; durable completion receipt and history.
- Goal/settings: date/time formats, both themes, quick compact/reduced-motion writes
  surviving reload, full custom reordering, paused Juz, traditional cycle change,
  Sabaq confirmation preference and a real dated page target.
- Exams: fixed-stage schedule and full date coverage, pass confirmation, run-up and
  aftermath, self exam including new pages, cancellation, and recording a past exam.
- History/analytics: real counts and durations, 365-day view, zero search results with
  filters retained, actual Sabaq filtering, saved session detail and keyboard dismissal.
- Backup: create verified restore point; download actual complete export; file preview;
  confirmed full restore from 26 held pages to the exported 24-page record; restore the
  automatically generated safety copy back to 26 pages. Preferences, roadmap, exams,
  two saved studies and nine recall events were included in the portable snapshot.
- Waiting update: old client kept its saved revision, weak flag and pause state;
  Apply update was blocked and offered Resume. After completion, applying reloaded
  only the requesting tab and kept its exact saved eight-page/one-shaky receipt.
- The final main-project build was also applied through the actual notice; the
  26-page record, goal, preferences and saved studies remained intact.
- The same final build kept the complete 604-page record and zero recorded studies.
  Today offered revision without extra Sabaq; its real Sabaqi assignment contained
  pages 1–17 (about 30 minutes), with page 2 correctly labeled Al-Baqarah alone.
- Full guide, original asset, storage FAQ, no-work and all-pages-memorized states
  inspected; no broken source asset or horizontal document overflow was observed.

## Offline evidence

The dedicated `127.0.0.1:4342` production server was stopped after only onboarding
and Today had been visited. A cold browser tab then loaded cached history. My Hifz,
Exams, More, Settings and Backup loaded with the server unavailable, including
routes not previously visited on that origin. The full 604-page exam eligibility
and unknown analytics values came from the actual local record.

Still offline, guarded reset created a verified recovery point, and Today showed
zero held pages with the first Sabaq on physical page 1. A real study was started,
paused, reloaded, resumed and completed. Its one-page saved receipt updated Today.
Restoring the reset safety copy returned to **604 held pages**, zero recorded studies
and the same revision plan. Thus offline coverage includes data writes and recovery,
not merely cached screenshots.

The `/PHOS` deployment artifact was also served under its actual prefix on a fresh
origin. Five-step onboarding saved a zero-memorization record and produced the
physical page-1 Sabaq. After stopping that server, an unvisited study route loaded
and reloaded, and the full guide cold-loaded with its correctly prefixed logo.
The scoped offline browser console had no warnings or errors.

## Responsive, interaction and motion evidence

Both themes were checked across Today, My Hifz, History, Exams, More, Settings,
Backup, Guide and focused study at 390px. The dark preference survived reload and
all route checks; document width remained within the viewport. Narrow 320px history,
trends and guide reflow and tablet 820px / desktop 1440px adaptations were inspected.
The desktop rail and full history table were rendered; tablet retained reachable
navigation and reading/work widths. No broken identity asset was observed.

History table records were opened with Enter in the actual final build. Modal focus
moved to the reading panel, and after its close animation Escape restored focus to
the same record button. The normal sheet's computed animation was `panel-in` at
240ms; tabs used `settle-in`. Reduced motion removed the sheet animation and held
the reminder still. Phone controls and focused study actions remained reachable.

The in-app reduced-motion preference persisted across reload. Source respects OS
reduced motion too. Live reminders changed from Al-Hijr to Al-Qamar while their
reserved figure height remained **310.67px** in that checked layout. All five panels
were present, with only one exposed; the fade-in computed duration was 450ms.
Pause/resume and the static reduced-motion reminder were checked. There are no
next/previous ayah controls. The sequence uses eight-second dwell / 400ms out /
450ms in, and stops in hidden tabs or offscreen.

Rendered phone evidence is saved outside the repository at
`PHOS-Claude/phos-redesign-evidence/phone-light.jpg`, `phone-dark.jpg` and
`study-dark.jpg`. The preview uses actual UI-created test records, not the owner's
deployed record. Temporary path-test server/artifact and dependency backup were removed.

## Boundaries and release notes

- The owner authorized commit, push and deployment on 2026-10-05. The old
  implementation is recoverable at `d3fe97b` and `preservation/phos-v0.3.0`.
- Desktop emulation does not prove Android/iOS launcher appearance, installed-PWA
  safe areas, mobile TalkBack/VoiceOver, hardware memory/latency, Safari native date
  input or virtual-keyboard behavior. Those need actual devices.
- No Lighthouse score, real-device performance budget or security penetration test
  is claimed. Offline bytes, a complete asset manifest, rendered layouts, regression
  tests, browser console checks and dependency audit are the available evidence.
- Browser storage can be evicted or cleared. A local restore point remains in the
  same browser; only an exported file kept elsewhere outlives that storage.
- Update detection needs a connection and checks on startup, foreground return,
  restored connection and every ten minutes while visible. It is an in-app waiting
  worker notice, not push messaging. It will take effect on phones after deployment.
- Older deployed clients follow their older worker policy during their first upgrade.
  Active-session protection in the new frontend cannot retroactively change old code.
- Scheduling remains scientifically informed engineering judgement, not a proven
  Hifz-outcome prediction or recitation assessment.

Firefox install-guide corrections were verified against Mozilla's primary help:
[Android web apps](https://support.mozilla.org/en-US/kb/use-web-apps-firefox-android)
and [Windows web apps](https://support.mozilla.org/en-US/kb/web-apps-firefox-windows).
