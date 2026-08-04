# PHOS — Product Guide (copy source)

Source copy for the in-app About / guide experience, taken from the PHOS
Guide PDF written by Qusai. Preserved here so the wording survives
independently of any single working session.

**Status (updated after Phase 8):** this file is now an _archive_ of the
original PDF copy. The guide that actually ships lives in
`components/about/guide-content.ts` and renders on the About page.

Keep this file for provenance — it is the author's original wording —
but edit the in-app guide, not this, when the product changes. Where the
two differ, the in-app version is correct: it was revised so that every
claim is true of the build it ships in, and the ⚠ notes below record
what had to change and why.

**Attribution:** the guide is authored by Qusai, who is also the author
of PHOS. An explicit "By Qusai" credit is to appear in the app (see
`phase-progress.md`, Phase 7).

---

## 1. Vision

Welcome to **P**ersonal **H**ifz **O**perating **S**ystem.

> To help you memorize the Quran more effectively, more consistently, and
> with greater confidence — using a calm, structured, and scientifically
> inspired workflow.

PHOS was never intended to be another productivity application or habit
tracker. Every screen, interaction, statistic and design decision exists
to serve that one purpose. Nothing was added because it looked
impressive.

Many memorization apps focus on checking boxes, streaks, notifications,
or overwhelming dashboards. PHOS starts from a different question: _"What
would the ideal companion for a Hafiz look like if it were designed from
the ground up?"_

PHOS does not replace your Mushaf, your teacher, or your discipline. It
exists to strengthen all three.

## 2. Philosophy

> Technology should support memorization — not compete with it.

The interface is intentionally calm. Animations are minimal. Colours are
gentle. Statistics inform rather than overwhelm. Nothing flashes; nothing
fights for attention — because every second spent admiring the
application is a second not spent with the Quran.

**A different kind of progress.** Success is remembering an ayah you once
struggled with. Revising consistently for months. Reducing hesitation.
Opening your Mushaf with more confidence than yesterday. The numbers are
only reflections of that journey, never the destination.

> **PHOS Insight** — The best memorization system is not the one with the
> most features. It is the one that quietly helps you remain consistent
> for years.

## 3. Scientific foundation

PHOS does not rely on a single memorization method; it combines several
evidence-based learning principles into one workflow, translating them
into practical daily actions. It does **not** claim to replace
traditional Hifz methods or scholarly guidance.

| Principle                 | Research inspiration                                 | How PHOS applies it                                                                                                                            |
| ------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Retrieval practice**    | Henry L. Roediger III & Jeffrey D. Karpicke          | Actively recalling strengthens retention more than rereading. PHOS creates regular opportunities to recall, not merely repeat.                 |
| **Spaced learning**       | Hermann Ebbinghaus and subsequent retention research | Memory fades without revision. Revision sits alongside memorization as an equal part of the journey, not an afterthought.                      |
| **Cognitive load theory** | Prof. John Sweller                                   | Divided attention impairs learning. Every screen answers one question: _what does the user need to focus on right now?_                        |
| **Deliberate practice**   | Prof. K. Anders Ericsson                             | Improvement comes from practising intentionally and identifying weaknesses — PHOS helps users understand their patterns, not just record them. |

> Memorization begins with learning. Retention begins with revision.

## 4. The experience over time

- **First day** — Expect to understand very little of the statistics, and
  that's fine. Set up your plan, glance at the dashboard, then begin.
- **First week** — Patterns emerge; revision starts feeling natural. PHOS
  rarely says "work harder" — it helps you work _more intentionally_.
- **First month** — PHOS stops merely recording what you did and starts
  helping you understand _how_ you have been memorizing.
- **Months later** — Opening PHOS becomes routine; the technology fades
  and only your progress remains.
- **Years later** — The greatest compliment PHOS could receive is _"I
  barely think about the application anymore."_ The app should never be
  the centre of the journey. The Quran should.

## 5. Daily workflow

1. **Open PHOS** — no wondering what to work on; today's memorization,
   revision and progress are immediately visible.
2. **Memorization** — quality before quantity. The goal is completing
   today's objective well, not completing more pages.
3. **Revision** — not optional, and not left until the end. It is one
   half of memorization.
4. **Reflection** — review progress to understand, not to judge or
   compare.
5. **Finish** — close PHOS and return to your day. Knowing when to step
   aside is a design principle.

## 6. Sections

- **Dashboard** — your home and daily starting point.
- **Memorization / Session** — where new progress begins. ✅ Resolved in
  Phase 7: the navigation was relabelled from "Session" to
  "Memorization", following the guide. It pairs far more clearly with
  "Revision" than the ambiguous "Session", which described both. The
  route stays `/session`, matching the backend's `Session` domain
  language.
- **Revision** — structured revisiting of memorized material. Not
  secondary; essential.
- **Analytics** — turns the journey into insight, to support better
  decisions rather than to impress with numbers.
- **History** — preserves the story. Progress is measured by the quiet
  accumulation of many days.
- **Settings** — personalization without added complexity. PHOS adapts to
  you, not the reverse.
- **Backup & Restore** — your journey represents countless hours;
  protecting it is essential and restoring should feel effortless.

## 7. Privacy and offline

Privacy was a founding principle, not a feature: **your memorization
belongs to you** — not advertisers, analytics companies, or external
servers. PHOS is local-first, which brings greater privacy, faster
performance, independence from constant internet access, and a more
reliable daily experience.

**Offline by design.** Memorization doesn't stop because you're
travelling; revision doesn't pause because you're offline. Connectivity
should be a convenience, not a requirement.

**Delivered as a PWA**, so there is no app store download. Once installed
it launches from the home screen or desktop in its own window.

⚠ **Accuracy gate:** the offline and PWA claims are not yet true — there
is no manifest, no icons and no service worker. This section must not
ship until Phase 7 has actually delivered them.

## 8. FAQ

**Do I need an internet connection every time?** No — PHOS is offline-first
wherever possible; connectivity is mainly for installation and updates.
⚠ Gated on Phase 7.

**Does PHOS replace my Mushaf?** No. It complements the journey by
organizing progress and supporting revision. The Mushaf remains at the
heart of Hifz.

**Does PHOS replace a teacher?** Absolutely not. No application can
replace the guidance, correction and experience of a qualified teacher.
PHOS is a companion, not a substitute.

**Is PHOS suitable for beginners?** Yes — from a first ayah to maintaining
years of Hifz. No technical knowledge is needed.

## 9. What PHOS is — and isn't

**PHOS is:** a companion · a guide · a structured workspace · a reflection
tool · a progress tracker · a support system.

**PHOS is not:** a shortcut · a replacement for discipline · a replacement
for your Mushaf · a replacement for a qualified teacher · a guarantee of
success.

Success in Hifz has always depended on sincerity, consistency, patience
and perseverance. PHOS simply helps organize those efforts. _Technology
can support your journey. Only you can walk it._

This section is the natural source for **Requirement 6 (First-Time
Guidance & Expectations)** — it is almost exactly the "what PHOS does and
does not do" screen that requirement asks for.

## 10. Closing

> **PHOS Insight** — You rarely notice a tree growing from one day to the
> next. Yet after years it stands where once there was only a seed.
> Memorization grows in much the same way.

Every improvement to PHOS is measured against one question: _"Does this
genuinely help someone memorize the Quran more effectively?"_ If yes, it
belongs. If not, it doesn't. Simplicity is a deliberate choice, not a
limitation.

> "The journey of a thousand pages is completed one ayah at a time."

---

## Known inaccuracies to resolve before publishing

| Claim                                        | Outcome                                                   | Resolved in |
| -------------------------------------------- | --------------------------------------------------------- | ----------- |
| "Set up your memorization plan" on first day | ✅ Onboarding wizard delivered                            | Phase 4     |
| Offline-first / works without internet       | ⚠️ **Reworded** — see below                               | Phase 7     |
| Delivered as an installable PWA              | ✅ Manifest, icon set and service worker delivered        | Phase 7     |
| Backup & restore "effortless"                | ✅ Fully wired                                            | Phase 3     |
| Settings personalization                     | ✅ Persists and takes effect                              | Phase 3     |
| Section named "Memorization"                 | ✅ Navigation relabelled from "Session" to "Memorization" | Phase 7     |

### The one claim that was corrected rather than delivered

The guide said PHOS "works entirely without an internet connection".
Taken literally that is true and it is a genuine strength — everything
runs on the user's own machine and nothing is sent anywhere. But it was
being read as "works when the application is closed", which is false:
memorization data lives in a SQLite database served by a local Node
process, and no amount of caching can serve data from a database that
nothing is reading.

The in-app guide (`components/about/guide-content.ts`) therefore states
the true claim and marks the boundary explicitly: PHOS needs no
internet, but it does need PHOS itself to be running. When it is not,
`public/offline.html` says so plainly — and says the user's progress is
safe — rather than blaming the network.

The service worker caches the application shell, which is what makes
PHOS installable and fast. It deliberately never caches API responses:
serving a stale study plan could let a user record work against pages
that are no longer scheduled.
