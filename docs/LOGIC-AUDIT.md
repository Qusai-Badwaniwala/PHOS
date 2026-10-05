# PHOS logic and storage audit — 2026-10-05

This is the post-release audit requested by the owner. The redesign was published
first, as instructed: commit `da5f22d52df71b1ed4aec78c5bb4cf108fa37fe2`, successful
[Pages run 37284247161](https://github.com/Qusai-Badwaniwala/PHOS/actions/runs/37284247161)
and [CI run 37284247197](https://github.com/Qusai-Badwaniwala/PHOS/actions/runs/37284247197).
The public redesigned onboarding loaded at `/PHOS/dashboard/` at 390 × 844, its
Apply update action activated the waiting release, and its browser console had no
warnings or errors. This browser started without a Hifz record; it does not prove
the owner's physical-phone upgrade or stand in for that record.

The v0.4.1 follow-up was implemented on `fix/phos-logic-audit`. The published
redesign and the earlier `preservation/phos-v0.3.0` reference remain recoverable.
Release gates and observed deployment are recorded in [VERIFICATION.md](VERIFICATION.md).

## Storage boundary

`/PHOS/` and `/Ex-Libris/` share `https://qusai-badwaniwala.github.io`. Browser site
data clearing acts on the origin; a different database name or service-worker
scope cannot prevent the user clearing both. True browser-level separation needs
a distinct hostname and an explicit record transfer. Changing the owner's installed
app address silently would not move its local records.

Source: [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria),
[GitHub Pages site addresses](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

The requested practical correction is a PHOS-only full reset, separate from the
existing recoverable progress reset. Full reset must remove PHOS records, settings,
roadmap, exams and local restore points, return to onboarding, and leave foreign
databases, OPFS files, caches and application preferences alone. Export is the
recovery route before deliberately erasing local restore points.

## Confirmed issues repaired

No critical issue was established. These priorities describe impact, not how dramatic
a code change looks. Regressions use the real browser repositories with fake IndexedDB
for controlled failures; separate real-browser journeys exercise the actual product.

### High

| Finding                                | Before / impact                                                                                                                                              | After / evidence                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partially saved onboarding             | The completed flag could save before declared Hifz or selected prior exams. A later failure skipped the wizard with an incomplete starting record.           | Pages, settings and exams now commit together using the existing Memory Engine. Injected page/exam failures leave the original record and the wizard available. `atomicSetup.test.ts`, `onboardingExams.test.ts`.                                                                                                                |
| Partial outside-work and repair writes | Seeding several pages or writing a repair marker after page changes could fail midway. Retrying a half repair could restagger pages.                         | Outside-work pages commit together; each repair and marker share one transaction, with a marker recheck inside it. Existing seeding and repair calculations remain. `workflowIntegrity.test.ts`.                                                                                                                                 |
| Startup and roadmap races              | Independent connections checked for missing records before opening their write transactions. Concurrent first opens could both add the same pages/Juz.       | Check and insertion now serialize in one transaction. Four independent startup connections and simultaneous roadmap reads pass. `atomicSetup.test.ts`.                                                                                                                                                                           |
| Split roadmap command                  | Saving an order and its custom sequence as separate writes could leave the order changed after the sequence failed.                                          | The settings choice, full permutation and pause command use transaction-bound repositories. Injected sequence failure retains the old order. `workflowIntegrity.test.ts`.                                                                                                                                                        |
| Repeating exam coverage                | The remaining-days calculation selected the first pages again after yesterday's block had already been reviewed. Later pages could miss coverage.            | Remaining coverage excludes pages reviewed since scheduling on earlier days. Today's portion stays stable as today's work completes; actual daily recall prevents duplicates. A 12-page regression advances to the remaining pages and preserves today's quota. `calendarAndEvidence.test.ts`.                                   |
| Valid checksum, invalid record         | A checksum proved bytes were intact but local restore did not also reject broken references. Impossible memory percentages could enter through file restore. | Local and portable restore validate semantics before creating a safety point or replacing the record: bounds, references, fixed exam scope and assignment metadata. Orphaned items and strength 4 are rejected without writes. Checksums are checked before compatible optional defaults are added. `restoreBoundaries.test.ts`. |

### Medium

| Finding                                        | Before / impact                                                                                                                                                                                       | After / evidence                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revision mistaken for new memorization         | Adaptive observed pace counted revised pages and sessions without actual recall as new-study evidence. Heavy revision could inflate suggested Sabaq.                                                  | The pace uses distinct actual new-study timestamps and recall-active days. Declared prior Hifz is not new-study evidence. Coefficients and the pacing policy remain. `calendarAndEvidence.test.ts`.                                                                                                                                                 |
| Traditional mode exceeded leftover time        | Fixed revision and new memorization were combined without fitting new work into the remaining time. In the regression, 570 seconds of revision plus a 60-second page exceeded a 600-second budget.    | Keep the full fixed revision portion and allocate new pages from time left. The same example keeps revision and recommends no new page; an oversized teacher-set revision portion still warns rather than silently shrinking. `calendarAndEvidence.test.ts`.                                                                                        |
| Inconsistent duration warnings                 | Exam/cycle warnings assumed a flat 45 seconds per page while study used page-specific estimates. Suggested cycles could still exceed the user's time.                                                 | Warnings and cycle suggestions use the same Duration Calculator as the plan. Search the existing 3–90-day bounds for a cycle whose actual portions fit. Exam full-scope coverage still takes priority over the budget. `calendarAndEvidence.test.ts`.                                                                                               |
| Local dates and daylight saving                | Parsing a date input as UTC could save the previous local day west of UTC. Dividing elapsed milliseconds by 24 hours made a spring week count as six days and could shift autumn projections.         | Date-only inputs parse as local dates; calendar-day differences and additions drive goals, exam/cycle schedules and charts. Los Angeles input tests and New York spring/fall regressions pass. `workflowIntegrity.test.ts`, `Calendar.test.ts`, `calendarAndEvidence.test.ts`.                                                                      |
| Overnight study disappeared or repeated        | A session started before the reporting window but resumed inside it could be omitted. A recall after midnight could also be offered again because the session began yesterday.                        | Planning deduplicates actual recall dates; period analytics loads relevant older sessions and groups actual recall activity by local date. Completion is counted on its completion day. The real-repository regression reports the resumed recall instead of zero. `OvernightStudy.test.ts`, adapter analytics test, `calendarAndEvidence.test.ts`. |
| Unreachable and lost exam outcomes             | A scheduled exam with a past date vanished from the actionable view; cancellation vanished from history. Concurrent bookings could create two upcoming exams, and a passed result could be cancelled. | Past-date scheduled exams have explicit Passed/Cancel actions while normal revision resumes. Cancellation remains visible. Booking is serialized and recorded outcomes cannot be reopened. `workflowIntegrity.test.ts`, `exams.test.tsx`.                                                                                                           |
| Confidence applied to the wrong page           | The confidence operation accepted a page ID without checking it matched the recall awaiting feedback.                                                                                                 | Reject a different page and retain the pending recall for a correct retry. The operation also validates recall success as a boolean. `workflowIntegrity.test.ts`.                                                                                                                                                                                   |
| Mixed-time exports                             | The seven stores were read independently; a study write between reads could combine page progress from one instant with history from another.                                                         | Export maps one coherent seven-store read transaction into both canonical and compatible representations. It retains IDs, format version and full-replacement semantics. Persistence regressions and the real exported/restored nine-recall record verify the path.                                                                                 |
| Stale study route state                        | A failed receipt read retained a previous receipt; an older asynchronous assignment could overwrite a newer route choice. Read failure looked like an empty assignment.                               | Load generations discard outdated responses, clear previous data/flags/receipt and show an explicit read error. Both new frontend regressions failed before the correction and pass afterward. `study-loading.test.tsx`.                                                                                                                            |
| Other open PHOS windows retained replaced data | Restore/reset refreshed the acting view while another window could retain old settings or an assignment.                                                                                              | Successful record replacement broadcasts to PHOS windows; they reload the actual record. Real-browser full reset returned both windows to onboarding, and restore refreshed both. The channel is best effort when browser support is unavailable.                                                                                                   |

## Requested additions and improvements

- **Full PHOS reset:** Settings → Reset & recovery → Start PHOS fresh. Exact
  `RESET PHOS` confirmation clears all eight PHOS stores, including restore points,
  reseeds 604 pages/default settings atomically, clears PHOS assignment/theme caches
  and returns to onboarding. Export first; deliberately fresh setup retains no local
  undo point. The older **Reset progress** remains separately recoverable and retains
  setup/settings/roadmap/restore points. Neither operation clears site-wide storage.
- **Restore at first open:** onboarding offers the existing full file restore with
  preview and verified safety copy. A new device need not invent onboarding answers
  before restoring its real record. No new storage format or product workflow was added.
- **Honest storage usage:** origin-wide quota/usage is labeled Shared site storage.
  The explanation names PHOS-specific reset and an externally kept export; persistence
  requests cannot promise immunity from manual clearing.
- **Honest cycle wording:** elapsed scheduled cycles are not labeled completed passes.
  Missed days still advance the teacher's calendar cycle, preserving the original policy.

## Browser evidence for the corrected product

The `/PHOS` production export was served on a new scratch origin alongside the
existing Ex Libris export. All ordinary PHOS records and the Ex Libris sentinel book
were created through their actual interfaces; no runtime database injection was used.
The owner's deployed records and Ex Libris source were untouched.

At 390 × 844, the tested record began with 23 Juz-30-first pages. A shaky page-1
Sabaq survived pause/reload and produced a one-page receipt. Eight-page Sabaqi with
one shaky flag produced its correct receipt, history and analytics: 24 held pages,
one new page, eight revised pages and two completed sessions. Both themes were used.
Custom Juz order, a paused Juz, fixed revision and a 41-page December goal were saved;
the goal retained all 24 held pages, including pages in the paused Juz. Stage-1 exam
scheduling and cancellation produced visible exam history.

An actual export contained two sessions and nine recalls. A local restore point was
created, then full reset returned both PHOS windows to onboarding. The Ex Libris
book **Isolation audit — keep this book** remained after reload. Onboarding file
restore previewed 24 learned pages / two sessions / nine recalls / one exam and
restored the record, goal, theme and both open PHOS windows. A verified safety copy
is part of that restore; full reset itself intentionally deletes local restore points.

## Coverage and decisions deliberately retained

Reviewed initialization/repairs; repository ownership; setup, roadmap and goals;
Learning/Memory study transitions; ordinary, recovery, traditional and exam planning;
analytics/history; portable/local restore/export/reset; provider state; PWA installation,
offline caching and guarded updates; and CI/Pages artifacts. Relevant real-browser
routes include onboarding, Today, Sabaq, revision, receipts, My Hifz, history, Exams,
Settings, protection, More and guide. Automated suites also cover controlled errors,
cross-midnight/DST, malformed records, transactions, retries and concurrency that a
normal phone journey cannot conveniently reproduce.

The 604-page mapping, Sabaq/Sabaqi/Manzil roles, memory state ladder, retention and
stability formulas, coefficients, recall append-only rule, voluntary extra study,
paused-Juz revision, fixed calendar rotation and exam precedence remain. Five engines
and repository boundaries remain. Database version 2 and export format 1 remain.
Elapsed session time still includes pauses and is labeled as elapsed, not active time.
No accounts, cloud sync, tracking or recitation surface was introduced.

## Remaining boundaries, not invented defects

- **Confirmed platform limitation:** browser Clear site data still affects both
  apps at the shared hostname. A distinct hostname plus explicit export/import is
  the separation option; it requires an owner-selected address before migration.
- **Confirmed developer dependency issue:** production audit is clear; five high
  advisories remain in the Next ESLint glob chain through `braces`. No compatible
  registry patch was available; npm's offered major downgrade is not a safe repair.
  This tooling does not ship in the static app. Recheck when a compatible fix lands.
- **Verification boundary:** desktop phone emulation cannot establish actual Android/
  iOS installation, launcher appearance, TalkBack/VoiceOver, native keyboard/date
  behavior or hardware latency. No penetration-test or Lighthouse score is claimed.
- **Optional research:** calibrating memory/pace estimates against actual Hifz outcomes
  would improve evidence. It is not authority to change the user's approved coefficients.
- **Optional hosting decision:** separate PHOS and Ex Libris hostnames. No silent
  address change or unrequested cloud backup was implemented.

The audit repairs established issues in the reviewed application; it is not a promise
that no unobserved defect can exist. Current gate and release evidence are in the
verification record rather than historical phase counts.
