/**
 * The PHOS guide, written by Qusai.
 *
 * Source: `docs/product-guide-source.md`. The guide was originally a
 * separate PDF; it now lives inside the application so it cannot be
 * lost, and so it can be held to the same accuracy standard as the rest
 * of the product.
 *
 * **Accuracy gate.** The original guide described the intended PHOS and
 * ran ahead of the build in several places. Nothing here may claim
 * something the application does not do — "no misleading wording" is a
 * release criterion.
 *
 * Two claims were qualified on the way in, and Phase 9 removed the
 * qualifications rather than the claims:
 *
 * - "works entirely without an internet connection" was narrowed,
 *   because the data lived behind a local server that had to be
 *   running. The engines and the database now run in the browser, so
 *   the guide's original, stronger sentence is simply true and is
 *   stated without hedging.
 * - the FAQ's offline answer carried the same distinction and no
 *   longer needs to.
 *
 * The gate cuts both ways, so the same phase added a claim that was not
 * in the source guide at all: data lives in one browser on one device,
 * and clearing site data erases it. That is the cost of storing nothing
 * on a server, and a guide that described only the benefit would be
 * misleading by omission.
 */

export interface GuideSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  /** A pull-quote, shown in the guide's quieter emphasis style. */
  readonly insight?: string;
}

export const VISION_QUOTE =
  "To help you memorize the Quran more effectively, more consistently, and with greater confidence — using a calm, structured, and scientifically inspired workflow.";

export const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    id: "vision",
    title: "Vision",
    paragraphs: [
      "PHOS was never intended to be another productivity application or habit tracker. Every screen, interaction, statistic and design decision exists to serve one purpose. Nothing was added because it looked impressive.",
      "Many memorization apps focus on checking boxes, streaks, notifications, or overwhelming dashboards. PHOS starts from a different question: what would the ideal companion for a Hafiz look like if it were designed from the ground up?",
      "PHOS does not replace your Mushaf, your teacher, or your discipline. It exists to strengthen all three.",
    ],
  },
  {
    id: "philosophy",
    title: "Philosophy",
    paragraphs: [
      "Technology should support memorization — not compete with it. The interface is intentionally calm. Animations are minimal. Colours are gentle. Statistics inform rather than overwhelm. Nothing flashes; nothing fights for attention — because every second spent admiring the application is a second not spent with the Quran.",
      "Success is remembering an ayah you once struggled with. Revising consistently for months. Reducing hesitation. Opening your Mushaf with more confidence than yesterday. The numbers are only reflections of that journey, never the destination.",
    ],
    insight:
      "The best memorization system is not the one with the most features. It is the one that quietly helps you remain consistent for years.",
  },
  {
    id: "adaptive",
    title: "How PHOS adapts to you",
    paragraphs: [
      "PHOS begins with what you tell it during setup — your level, your pace, the time you have — and treats every answer as an estimate rather than a verdict. As you study, it watches what actually happens: how often pages come back to you, how confident each recall felt, how consistently you return.",
      "Those observations gradually replace the initial estimates. When your recall holds strong across many sessions, the daily target rises a little. When pages stop settling, it eases back to protect what you already know. Changes are drawn from long stretches rather than single days, so a bad morning never rewrites your plan.",
      "PHOS never files you under a label. Its view of you is built from a rolling window of recent evidence, so a difficult month passes out of view on its own — and so does an easy one.",
    ],
  },
  {
    id: "science",
    title: "Scientific foundation",
    paragraphs: [
      "PHOS does not rely on a single memorization method; it combines several evidence-based learning principles into one workflow, translating them into practical daily actions. It does not claim to replace traditional Hifz methods or scholarly guidance.",
      "Retrieval practice (Roediger & Karpicke): actively recalling strengthens retention more than rereading, so PHOS creates regular opportunities to recall rather than merely repeat.",
      "Spaced learning (Ebbinghaus and subsequent retention research): memory fades without revision, so revision sits alongside memorization as an equal part of the journey rather than an afterthought.",
      "Cognitive load theory (Sweller): divided attention impairs learning, so every screen answers one question — what do you need to focus on right now?",
      "Deliberate practice (Ericsson): improvement comes from practising intentionally and identifying weaknesses, so PHOS helps you understand your patterns rather than only recording them.",
    ],
    insight: "Memorization begins with learning. Retention begins with revision.",
  },
  {
    id: "difference",
    title: "Why PHOS is different",
    paragraphs: [
      "It recommends, and you decide. PHOS explains the reasoning behind the day it has planned, and you remain free to do more, do less, or work entirely outside it and tell PHOS afterwards.",
      "Retention outranks speed everywhere in the application. When the two conflict, PHOS protects what you have already memorized — even at the cost of a slower pace.",
      "Returning after a break is treated as a normal part of a long journey. There are no streaks to break, and no message will ever suggest you have failed.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy and where your data lives",
    paragraphs: [
      "Privacy was a founding principle, not a feature: your memorization belongs to you — not to advertisers, analytics companies, or external servers. PHOS stores everything in a database inside your own browser, on the device you are reading this on. There are no accounts, no sign-in, no telemetry and no cloud sync. Nothing you record is ever transmitted anywhere, because there is nowhere for it to go.",
      "Everything runs on your device, so PHOS needs no internet connection at all. Open it once, and it keeps working on a plane, in a basement, or with the connection switched off entirely.",
      "PHOS can be installed like an app, launching from your home screen or desktop in its own window rather than a browser tab. Installing is worth doing: browsers protect an installed app's data more carefully than a tab's.",
      "The other side of that promise is worth stating plainly. Your record lives in this browser, on this device — so it will not appear in a different browser, on a different phone, or in a private window, and clearing this browser's site data erases it along with everything else. Nobody can reach your Hifz record, which also means nobody can recover it for you.",
      "So take your data with you. Export a readable copy from the Backup page whenever you have made real progress, and keep the file somewhere you trust. That file is the one copy that outlives the browser, and it is what you would use to move PHOS to a new device.",
    ],
  },
  {
    id: "future",
    title: "Future vision",
    paragraphs: [
      "Every improvement to PHOS is measured against one question: does this genuinely help someone memorize the Quran more effectively? If yes, it belongs. If not, it does not. Simplicity is a deliberate choice, not a limitation.",
      "The greatest compliment PHOS could receive is: I barely think about the application anymore. The app should never be the centre of the journey. The Quran should.",
    ],
    insight:
      "You rarely notice a tree growing from one day to the next. Yet after years it stands where once there was only a seed. Memorization grows in much the same way.",
  },
];

export interface FaqEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export const FAQ: readonly FaqEntry[] = [
  {
    id: "internet",
    question: "Do I need an internet connection?",
    answer:
      "Only the first time, to open the page. After that PHOS runs entirely on your device — planning, sessions, statistics, backups — with the connection switched off. None of your data is sent anywhere, because there is nowhere for it to be sent.",
  },
  {
    id: "mushaf",
    question: "Does PHOS replace my Mushaf?",
    answer:
      "No. It complements the journey by organizing progress and supporting revision. The Mushaf remains at the heart of Hifz, and PHOS deliberately shows no Quran text — you memorize from your own copy.",
  },
  {
    id: "teacher",
    question: "Does PHOS replace a teacher?",
    answer:
      "Absolutely not. No application can replace the guidance, correction and experience of a qualified teacher. PHOS is a companion, not a substitute, and it cannot hear your recitation or correct your Tajweed.",
  },
  {
    id: "beginners",
    question: "Is PHOS suitable for beginners?",
    answer:
      "Yes — from a first ayah to maintaining years of Hifz. No technical knowledge is needed, and the setup takes a few minutes. If you have already memorized part of the Quran, you can tell PHOS during setup and it will schedule revision for it rather than treating it as new.",
  },
  {
    id: "order",
    question: "Can I memorize in my own order?",
    answer:
      "Yes. Start at Juz 1, start at Juz 30, work in reverse, or arrange your own sequence. You can also pause a Juz you are setting aside — PHOS will stop drawing new pages from it while continuing to revise what you already learned there. Changing your order never affects pages you have already memorized.",
  },
  {
    id: "missed",
    question: "What happens if I miss days?",
    answer:
      "Nothing is lost and nothing is held against you. PHOS notices the gap and rebalances the plan — leaning on revision first and taking on less new memorization until your recall steadies. After a long break it will start with revision alone, then reintroduce new pages as you settle back in.",
  },
  {
    id: "outside",
    question: "Can I record memorization I did away from PHOS?",
    answer:
      "Yes. The dashboard has a place to log pages you memorized elsewhere, and PHOS will fold them into your revision schedule. Pages it is already tracking are left exactly as they are.",
  },
  {
    id: "backup",
    question: "How do I keep my progress safe?",
    answer:
      "Two ways, and they are not interchangeable. A backup is a verified copy kept inside PHOS, ready to restore in one click — perfect for undoing a mistake, and taken automatically before anything destructive. An export is a file saved wherever you choose, and it is the only copy that survives clearing your browser's data or moving to a new device. Take an export whenever you have made progress you would be sorry to lose.",
  },
  {
    id: "goal",
    question: "Can I set a target and have PHOS track it?",
    answer:
      'Yes, and it is optional. Under Settings → Goal you name the Juz you want memorized and by when. The list is your own memorization order, not the Mushaf\'s, so somebody memorizing Juz 30 first is offered Juz 30 first and "through Juz 5" means the 124 pages they would actually have covered. The Dashboard then tells you where your current pace would take you — measured from the pages you have actually started, never from the estimate you gave during setup. PHOS says nothing until it has watched you memorize for about a week, because a projection built on two or three days is arithmetic on noise. If your pace would land after your goal it says so plainly and without judgement, and it will remind you that memorizing faster is not automatically the right answer: PHOS protects what you already know before it adds more.',
  },
  {
    id: "revision-cycle",
    question: "My teacher sets a fixed revision cycle. Can PHOS follow it?",
    answer:
      "Yes. Under Settings → How revision is chosen you can switch from PHOS's own scheduling to a fixed cycle, and set how many days a full pass takes — seven is the usual Manzil rotation. PHOS then divides everything you have memorized across those days, in your own memorization order and in continuous blocks, and repeats forever. It tells you which day of the cycle you are on, which is the one thing a paper schedule cannot. Your position comes from the date you started, not from your last session, so missing a day leaves you where you actually are rather than restarting the rotation.",
  },
  {
    id: "which-revision-mode",
    question: "Which revision mode is actually better?",
    answer:
      "PHOS's own scheduling reaches the same retention for fewer pages a day, because it spends your effort where your recall shows it is needed rather than spreading it evenly. That is the honest answer and PHOS says so on the setting itself. But it is not the only thing that matters: a fixed cycle is predictable, it is what most institutions teach, and if your teacher sets a rotation you need to follow that rotation. So PHOS states the recommendation once and then leaves the choice alone — no warnings, no nudges. Either way new memorization is paced identically; the setting changes only how revision is picked. If an exam is scheduled, its run-up takes precedence over both until you mark it passed.",
  },
  {
    id: "exams",
    question: "Can PHOS help me prepare for a Hifz exam?",
    answer:
      "Yes. The Dashboard carries an exam roadmap of eight stages — Juz 30, then 28–30, then 26–30, then Juz 1–5 alongside 26–30, and onward to the whole Quran. A stage opens once every page in it has been memorized, because the run-up schedule revises those pages and PHOS cannot revise a page you have never learned. Give a stage a date and PHOS divides the entire scope evenly across the days remaining, in continuous blocks, so every page is revised before the exam rather than left to a priority queue that might never reach it. If your madrasa uses a different ladder, Self Exam takes any Juz you choose and the same date.",
  },
  {
    id: "past-exams",
    question: "I passed exams before I started using PHOS. Can I record those?",
    answer:
      'Yes, in two places. Onboarding lists the eight roadmap stages so you can tick the ones you have already passed, and the Exams screen has "Add a past exam" for anything you remember later, anything outside the roadmap, or an exam you sit at your madrasa while using PHOS. The date is optional — nobody remembers the day they sat Juz 30, so an undated one simply reads "Before you started PHOS" rather than showing a guess. Recording a past exam changes nothing about your scheduling: it is history, not a setting. It also never unlocks a stage, because stages open on what you have memorized, and it never triggers the fallen-behind report, because PHOS did not run that exam\'s preparation and so set nothing aside for it.',
  },
  {
    id: "exam-mode",
    question: "What changes while an exam is scheduled?",
    answer:
      "Revision outside the exam's scope is paused — including pages PHOS would normally push to the front as weak. That is deliberate: a week before an exam you cannot act on \"eleven other pages are slipping\", and showing it would only divide your attention when it matters most. Those pages keep decaying, and the moment you mark the exam passed PHOS tells you exactly how many fell behind and which to start with. One other thing changes: if covering the scope in the days you have left needs more time than you said you had, PHOS says so and schedules it anyway. Everywhere else it will not exceed your daily time, but an exam's date and syllabus are set by somebody else, and arriving having never revised part of it is worse than a long day.",
  },
  {
    id: "exam-order",
    question: "Which memorization order should I choose if I plan to sit exams?",
    answer:
      "Exam order — Juz 30 → 26, then 1 → 25. The first three exam stages cover Juz 30, then 28–30, then 26–30, so the last five Juz come first, and they descend so each stage completes as early as possible: Juz 30 opens the first, adding 29 and 28 opens the second, adding 27 and 26 opens the third. Going upward through 26–30 instead would leave the first stage locked until the whole block was finished. If you are not planning on exams, any of the other orders is just as well supported and nothing about scheduling depends on this choice.",
  },
  {
    id: "devices",
    question: "Can I use PHOS on my phone and my laptop?",
    answer:
      "You can install it on both, but each keeps its own separate record — PHOS has no account and no sync, which is exactly why nothing about your Hifz is stored anywhere but your own devices. To move your progress, export a file from one and import it on the other. Most people find it simplest to choose one device as the real one.",
  },
  {
    id: "losing-data",
    question: "Could I lose my progress?",
    answer:
      "Yes, in one specific way: PHOS lives in your browser's storage, so clearing your browsing data for this site — or uninstalling the app and choosing to remove its data — deletes it. Nothing else will. PHOS asks the browser to protect its storage, browsers honour that more readily once PHOS is installed, and normal use, updates and restarts are all safe. Keeping an exported file somewhere makes the question moot.",
  },
];

/** Author attribution, given the gold treatment reserved for it. */
export const AUTHOR = "Qusai";
