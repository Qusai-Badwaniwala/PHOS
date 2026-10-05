# PHOS reimagined — implementation authority

The owner adopted this experience as PHOS's official frontend on 2026-10-05.
The main project is `phos-handoff/phos-integrated`; implementation was developed
and validated in the isolated `phos-reimagined` worktree on `codex/phos-reimagined`.
The owner subsequently authorized commit, push and deployment on 2026-10-05.
The old implementation remains recoverable at Git commit `d3fe97b`.

Read [HANDOFF.md](HANDOFF.md) for architecture and [VERIFICATION.md](VERIFICATION.md)
for observed evidence and device boundaries. Historical visual rules do not override
this approved experience.

The current v0.4.1 implementation adds the approved post-release logic/storage
corrections in [LOGIC-AUDIT.md](LOGIC-AUDIT.md). The welcome screen also opens the
existing verified full file restore. Settings separates preferences reset, recoverable
progress reset and a deliberately complete PHOS-only return to onboarding. Expired
scheduled exams remain actionable, and cancelled exams remain in history. These
corrections preserve this visual and product direction.

## Design thesis

A quiet study folio: a considered place to return to the same pages over years.
Today is a useful study order, not a wall of achievements. Hifz is represented by
actual held pages and recorded recall; unknown metrics stay unknown. There is no
streak pressure, ornamental spirituality, account system, or Quran reader.

Light uses mineral ivory, warm paper, charcoal ink and restrained rose. Dark uses
ink-plum, quieter lifted surfaces, warm text and a lighter rose. Neither relies on
translucent glass, gold decoration, gradients or endless cards. Working rows and
fine dividers carry the hierarchy; the day's assignment may own one raised surface.

Locally bundled Source Sans 3 serves prose and controls, Source Serif 4 the main
headings, and Noto Naskh Arabic actual Arabic text. Body text is 16px, controls 14px,
metadata 12px; main headings 30–36px. Arabic reminders use 25–28px with a generous
line height. Labels are explicit, units remain visible, and long content wraps.

Phone gutters are 20px, reduced to 16px below 360px. Primary touch actions are
48px and small controls at least 44px. Desktop uses a 208px rail and bounded work
columns, with focused study limited to 760px. Native scrolling, safe-area padding,
readable modal focus, keyboard support and text reflow belong to the product.

The existing PHOS book/arch identity is retained in onboarding and the guide.
It does not compete with a study assignment. The author credit remains quiet.

## Navigation and complete screen coverage

Four primary destinations: **Today / My Hifz / Exams / More**. My Hifz contains
Overview and Trends, with History directly accessible. More holds Settings,
Protect your record, and About & guide. All original routes and deep links remain.
Focused study uses its own layout; Today is always reachable.

| Screen              | Implemented experience and preserved capability                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding          | Five deliberate steps: current memorization, all five memorization orders, pace/time, teacher or immediate revision, optional passed exam stages; final summary previews the actual page/Juz assignment. Zero through 604 memorized pages are supported. Local privacy and physical-Mushaf expectations remain clear.                                                                                           |
| Today               | Recommended study ordered by the existing engine priorities; Sabaq, Sabaqi, Manzil and recovery keep their meaning. Plan explanation, held-page count, weekly work/recall, optional goal, recent activity, outside-work logging and reminders remain. Ordinary recommendations account for today's new pages; explicit extra Sabaq remains available while pages remain to learn. An open study takes priority. |
| Sabaq               | Assignment first, with physical page, surah and Juz context; start, weak-page marking, pause/resume, confirm-completion preference, partial close and saved receipt. Reload restores the exact open assignment and flags. No displayed Mushaf or verse reader.                                                                                                                                                  |
| Revision            | The same focused study model for Sabaqi, Manzil, recovery and exam revision; actual page lists, scope, weak flags, progress and timing. Existing default successful recall and explicit shaky-page recall are preserved.                                                                                                                                                                                        |
| Completion          | Independent saved receipt with actual recorded count, shaky count, elapsed time, study date/type, Today and history links. The receipt survives reload and cannot be overwritten by the next assignment. Closing with zero completed pages says so honestly.                                                                                                                                                    |
| My Hifz overview    | Actual held pages, period-specific revision/session measures, daily new/revisited page charts and memory-state distribution. Charts also expose readable data. Unknown averages stay unscored.                                                                                                                                                                                                                  |
| Trends              | Recall weighted by recorded events, studied pages and actual sessions. 24 hours / 7 / 30 / 365 days / all time remain. A comparison requires recall in both periods; empty history is not scored as failed retention.                                                                                                                                                                                           |
| History             | Search, study type, status and inclusive date range remain visible even with zero matches. Timeline/table views, complete session details, saved page/recall records and deep links remain. Mobile details use a reading sheet; desktop uses a centered panel.                                                                                                                                                  |
| Exams               | All eight fixed stages with true page-based eligibility; self exams, past exams, date/scope and include-new option. Full run-up schedule, coverage, pass/cancel confirmations, aftermath and exam history remain. No invented stage-unlock rule.                                                                                                                                                                |
| Settings            | General formats; authored themes, compact and reduced motion; all roadmap modes, full 30-Juz custom reordering and paused Juz; optional target/date and projection; adaptive/traditional cycle, restart; study confirmation and notifications preferences; guarded reset/recovery. Section links remain usable.                                                                                                 |
| Protect your record | Complete export, truthful local/external-copy distinction, file preview and confirmed full restore, verified safety copy, local restore/creation/deletion and error feedback. Restoring never silently merges history.                                                                                                                                                                                          |
| More                | Settings, protection and full guide remain easy to discover; installation guidance explains connection and local-storage limits.                                                                                                                                                                                                                                                                                |
| About & guide       | Existing comprehensive product guide, daily workflow, expectations, FAQs, identity and author credit. Storage promises were corrected to reflect browser eviction and lost/damaged devices.                                                                                                                                                                                                                     |
| Shared states       | Shaped loading placeholders, initialization retry, route/read errors, zero/partial history, no recommended work, no new pages left, disabled/pending controls and not-found return to Today. No meaningful capability is removed for visual convenience.                                                                                                                                                        |

On phones, navigation and study actions stay reachable without pinning all content.
On desktop, Today/analytics/protection use purposeful work and context columns;
settings and guide keep a reading width, history gains its table, and study stays
focused. Dialogs become bounded sheets on small screens and panels on larger ones.

## Motion and interactions

- Page settling: opacity and a 7px displacement, about 220ms; interruptible route motion.
- Press feedback: about 100ms. Do not delay a data write for an animation.
- Reading sheets/panels: 240ms in, 140ms out; scrim 180ms in. Select menus: 160/100ms.
- Tabs: a short 220ms settling transition. Soft deceleration uses
  `cubic-bezier(.22, 1, .36, 1)`; no theatrical overshoot or scroll hijacking.
- Five **existing** reminder ayahs dwell for eight seconds, fade out over 400ms,
  then the next fades in over 450ms. No sliding, next/previous controls, or rotation.
  Overlaid grid cells reserve the longest reminder's height. A quiet pause control
  is available; hidden tabs and offscreen reminders stop changing.
- OS and in-app reduced motion remove spatial/continuous movement. Reminders hold
  still. Keyboard/focus and success/error feedback remain readable.
- Focus moves to the route heading, active study heading or receipt. Modal focus is
  trapped and returns to its connected trigger; body scroll locks while open.

## Approved repairs, separated from art direction

The redesign retains five engines and repository ownership. Repairs address
observed faults rather than replacing verified Hifz algorithms:

- Complete seven-store portable snapshot validation, checksum and atomic full
  restore, with verified safety copy. Compatible legacy files explain absent data.
- Four-store atomic study commit composes the existing Memory Engine with
  transaction-bound repositories. Memory, recall and session item cannot diverge
  on a failed write. Retries skip already recorded items.
- Transactional one-open-session enforcement; durable assignment, pause/flags and
  idempotent completion; independent receipt URLs.
- Shared initialization/repair barrier with retry; serialized preference writes;
  stale asynchronous reads cannot replace newer history/analytics choices.
- Correct ordinary daily new-page allowance while preserving fractional pacing
  and voluntary extra study. No change to retention coefficients or state ladder.
- Correct analytics labels, aggregation, period length, zero/unknown distinction,
  inclusive dates and empty-period comparisons. Goal position counts held pages
  in paused Juz; pausing only changes eligibility for new study.
- Correct physical-page surah labels using verified chapter end pages; this does
  not change stored progress or retention calculations. History table actions now
  support keyboard opening and preserve dates/page details on narrow screens.
- Verified safety copy and atomic progress reset, including exams. Existing settings,
  roadmap and restore points survive the reset.
- Complete scoped offline build, atomic installation, explicit waiting updates,
  active-study protection and release artifact gates. Production dependency audit
  is clear; the remaining developer-tool advisories are documented separately.

## What stays intact

604 physical Mushaf pages; Memory Engine ownership and six-state progression with
regression; recovery/overdue/recent/long-term/new priorities; all roadmap orders and
paused Juz; adaptive and fixed-cycle revision; exam coverage and outside-work rules;
optional goals and actual pacing; append-only ordinary recall history; IndexedDB
version 2, export format 1, local-only privacy and no server. No cloud, gamification,
recitation assessment, Quran reader or silent product expansion was introduced.

## Adoption and future work

This is the official frontend. The owner's 2026-10-05 instruction authorizes its
commit/push and deployment through the existing Pages workflow, followed by the
requested storage/reset investigation and complete logic audit. Actual release
evidence belongs in `VERIFICATION.md`.

A new content build is detected on launch, on returning to the foreground, when a
connection returns, and at ten-minute intervals while visible. An in-app notice
provides **Apply update / Later**. An open study blocks activation and offers Resume.
Applying reloads only the requesting tab and keeps the local record. A deployed
phone must reconnect to discover/download a release; no push service is implied.

Physical Android/iOS installation, launcher appearance, screen readers and real
phone latency remain device validation, not claims from desktop emulation. See
[VERIFICATION.md](VERIFICATION.md) for the exact tested scope.
