import { addLocalDays } from "@/shared/utils";
import { analyticsOps, sessionOps } from "@/client/operations";
import { getDailyStudyMinutes } from "./settings";
import { primarySurahForPage, surahLabelForRange } from "@/shared/constants";
import {
  describeSessionType,
  formatApproximateDuration,
  formatDatePreferred,
  formatPageList,
} from "@/lib/format";
import { SESSION_TYPE_WORKLOAD_CATEGORIES } from "@/engines/learning/constants";
import { ReportingPeriod, SessionType, WorkloadCategory } from "@/shared/types";
import type { GoalProjectionDTO } from "@/shared/dto";
import type {
  ActivityItemDTO,
  DashboardDTO,
  DayProgressDTO,
  GoalCardDTO,
  RevisionType,
  WeeklyReviewDTO,
} from "@/types/dto";

/**
 * Turns a projection into the one sentence the goal card shows.
 *
 * The wording lives here, beside the arithmetic that justifies it,
 * because it is the part the user actually reads and believes. Three
 * rules hold it together:
 *
 * 1. **Never say a pace PHOS has not measured.** Below the evidence
 *    threshold it says so plainly rather than showing a confident date
 *    built on three days of data.
 * 2. **"Behind" is a fact about pace, not a verdict on effort.** No
 *    exclamation, no warning colour, no implication of failure.
 * 3. **Going faster is not automatically right.** PHOS protects
 *    retention over speed everywhere else; where the projection lands
 *    late, the note says so, or the goal card would quietly reverse the
 *    application's central principle.
 */
function toGoalCard(projection: GoalProjectionDTO): GoalCardDTO {
  const base = {
    targetPages: projection.targetPages,
    targetDate: formatDatePreferred(projection.targetDate),
    pagesMemorized: projection.pagesMemorized,
    pagesRemaining: projection.pagesRemaining,
    pacePerDay: projection.observedPagesPerDay,
    projectedDate: projection.projectedCompletionDate
      ? formatDatePreferred(projection.projectedCompletionDate)
      : null,
    daysFromGoal: projection.daysFromGoal,
    targetReached: projection.targetReached,
  };

  if (projection.targetReached) {
    return {
      ...base,
      summary: `You've reached your goal of ${projection.targetPages} pages.`,
    };
  }

  if (projection.observedPagesPerDay === null || projection.projectedCompletionDate === null) {
    return {
      ...base,
      summary: `${projection.pagesMemorized} of ${projection.targetPages} pages memorized.`,
      note: "PHOS will estimate a finish date once it has watched you memorize for about a week.",
    };
  }

  const pace = Math.round(projection.observedPagesPerDay * 10) / 10;
  const paceText =
    pace >= 1
      ? `about ${pace} page${pace === 1 ? "" : "s"} a day`
      : `about ${pace} of a page a day`;
  const days = projection.daysFromGoal ?? 0;

  // Within a fortnight either way is "around" the goal — claiming to
  // land on a specific side of it would overstate what an averaged pace
  // can tell anyone.
  if (Math.abs(days) <= 14) {
    return {
      ...base,
      summary: `At ${paceText}, you'd reach ${projection.targetPages} pages around ${base.projectedDate} — close to your goal.`,
    };
  }

  if (days < 0) {
    return {
      ...base,
      summary: `At ${paceText}, you'd reach ${projection.targetPages} pages around ${base.projectedDate} — ${formatApproximateDuration(days)} before your goal.`,
    };
  }

  return {
    ...base,
    summary: `At ${paceText}, you'd reach ${projection.targetPages} pages around ${base.projectedDate} — ${formatApproximateDuration(days)} after your goal.`,
    note: "That is a fact about pace, not a verdict. PHOS protects what you already know before it adds more, so memorizing faster is not automatically the right answer.",
  };
}

function formatEstimatedTime(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function toRevisionType(workloadCategory: string): RevisionType {
  if (workloadCategory === WorkloadCategory.Recovery) return "recovery";
  if (workloadCategory === WorkloadCategory.LongTermRevision) return "manzil";
  // OverdueRevision and RecentRevision both represent near-term review
  // work in the backend's model; the frontend's "sabqi" (recent
  // revision) is the closest existing category for both.
  return "sabqi";
}

/** Mirrors `toBackendSessionType()` in `lib/api/revision.ts`. */
function toSessionType(workloadCategory: string): SessionType {
  if (workloadCategory === WorkloadCategory.Recovery) return SessionType.Recovery;
  if (workloadCategory === WorkloadCategory.LongTermRevision) return SessionType.Manzil;
  return SessionType.Sabqi;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** True if two dates fall on the same calendar day, in local time. */
function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Dashboard data, assembled from the Analytics and Adaptive Engines.
 *
 * Honest limitations of this mapping, documented rather than silently
 * papered over:
 * - Surah names now *are* shown, from `shared/constants/mushaf.ts`.
 *   That does not breach "never stores, renders, or displays Quran
 *   text": a surah's name and the page it begins on are metadata, in
 *   exactly the same category as the `juzNumber` already stored on
 *   every Page. No ayah is ever rendered — the user reads from their
 *   own Mushaf, and PHOS only tells them where to open it. Before this,
 *   the dashboard said "Page 53" and nothing else, which is
 *   meaningless without a Mushaf already in hand.
 * - `stats.weeklyProgress` (a percentage) and `weeklyProgress` (the
 *   day-by-day array) are derived from the historical report's
 *   completed-session data, not a dedicated engine field for either.
 *   Each session's own `startedAt` is used to determine which day it
 *   belongs to — so completing a session today correctly marks
 *   *today's* column, not whichever day the report happened to be
 *   requested on.
 * - `recentActivity` "milestone" entries (e.g. "Completed Juz 1") have
 *   no engine equivalent — the Analytics Engine does not track
 *   milestones — so only real session/backup activity is included.
 */
export async function getDashboardData(): Promise<DashboardDTO> {
  const studyMinutes = await getDailyStudyMinutes();
  const [dashboard, plan, weekHistory, weekTrend, goalProjection] = await Promise.all([
    analyticsOps.getDashboard(),
    sessionOps.getTodayPlan(studyMinutes),
    analyticsOps.getHistoricalReport(ReportingPeriod.Weekly),
    analyticsOps.getTrendAnalysis(ReportingPeriod.Weekly),
    analyticsOps.getGoalProjection(),
  ]);

  const newMemorizationItems = plan.studyItems.filter(
    (item) => item.workloadCategory === WorkloadCategory.NewMemorization,
  );
  const allRevisionItems = plan.studyItems.filter(
    (item) => item.workloadCategory !== WorkloadCategory.NewMemorization,
  );

  // Bind first/last once. `firstNew`/`firstRevision` being defined is
  // exactly equivalent to the previous `.length > 0` checks, expressed
  // so `noUncheckedIndexedAccess` can verify the accesses below.
  const firstNew = newMemorizationItems[0];
  const lastNew = newMemorizationItems[newMemorizationItems.length - 1];
  const firstRevision = allRevisionItems[0];

  // The revision card shows the *next revision assignment*, scoped to a
  // single SessionType exactly as `lib/api/revision.ts` scopes it — so
  // the Dashboard and the Revision page can never disagree about how
  // many pages that assignment contains. `stats.revisionQueue` below
  // still reports all revision work scheduled today, which is what its
  // "Pages scheduled for today" label describes.
  const revisionScope: readonly string[] = firstRevision
    ? SESSION_TYPE_WORKLOAD_CATEGORIES[toSessionType(firstRevision.workloadCategory)]
    : [];
  const revisionItems = allRevisionItems.filter((item) =>
    revisionScope.includes(item.workloadCategory),
  );

  const session =
    firstNew && lastNew
      ? {
          id: firstNew.pageId,
          status: "not_started" as const,
          assignment: {
            startPage: firstNew.pageNumber,
            endPage: lastNew.pageNumber,
            target: `Page ${firstNew.pageNumber}`,
            surah: surahLabelForRange(firstNew.pageNumber, lastNew.pageNumber),
            surahArabic: primarySurahForPage(firstNew.pageNumber)?.arabicName,
            juzNumber: firstNew.juzNumber,
          },
          progress: { current: 0, total: newMemorizationItems.length },
          estimatedTime: formatEstimatedTime(
            newMemorizationItems.reduce((sum, i) => sum + i.estimatedDuration, 0),
          ),
        }
      : null;

  /*
   * Revision pages are chosen by memory priority, not by where they sit
   * in the Mushaf, so an assignment is routinely scattered — 345, 346,
   * 400 — and arrives in priority order rather than page order.
   *
   * The card used to label that with `surahLabelForRange(first, last)`
   * taken from the *unsorted* list. Two things were wrong with it: a
   * range implies every page between its ends, and the "ends" were
   * whichever pages happened to rank first and last by priority, so the
   * label could even run backwards.
   *
   * A range is only honest when the pages really are consecutive.
   * Otherwise the truthful summary is which Juz the work touches.
   */
  const revisionPages = revisionItems.map((item) => item.pageNumber).sort((a, b) => a - b);
  const firstPage = revisionPages[0];
  const lastPage = revisionPages[revisionPages.length - 1];
  const isConsecutive =
    firstPage !== undefined &&
    lastPage !== undefined &&
    lastPage - firstPage + 1 === revisionPages.length;
  const juzCovered = [...new Set(revisionItems.map((item) => item.juzNumber))].sort(
    (a, b) => a - b,
  );

  const revision = firstRevision
    ? {
        id: firstRevision.pageId,
        status: "not_started" as const,
        assignment: {
          type: toRevisionType(firstRevision.workloadCategory),
          // Listed in page order, which is how someone holding a Mushaf
          // would work through them.
          pages: revisionPages.map((pageNumber) => `Page ${pageNumber}`),
          totalPages: revisionItems.length,
          ...(isConsecutive
            ? {
                surah: surahLabelForRange(firstPage, lastPage),
                juzNumber: firstRevision.juzNumber,
              }
            : {}),
          juzCovered,
        },
        progress: { current: 0, total: revisionItems.length },
        estimatedTime: formatEstimatedTime(
          revisionItems.reduce((sum, i) => sum + i.estimatedDuration, 0),
        ),
      }
    : null;

  const completedThisWeek = weekHistory.sessions.filter((s) => s.completed).length;
  const weeklyProgressPercent =
    weekHistory.sessions.length > 0
      ? Math.round((completedThisWeek / weekHistory.sessions.length) * 100)
      : 0;

  const today = new Date();
  const weeklyProgress: DayProgressDTO[] = Array.from({ length: 7 }, (_, i) => {
    const dayDate = addLocalDays(today, -(6 - i));
    const completedOnThisDay = weekHistory.sessions.some(
      (s) =>
        s.completed &&
        s.completedInPeriod !== false &&
        isSameLocalDay(new Date(s.completedAt ?? s.startedAt), dayDate),
    );
    // getDay() is always 0-6 and DAY_LABELS has exactly 7 entries, so
    // the fallback is unreachable; it exists to satisfy
    // `noUncheckedIndexedAccess` without weakening the check.
    return { day: DAY_LABELS[dayDate.getDay()] ?? "", completed: completedOnThisDay };
  });

  const recentActivity: ActivityItemDTO[] = [...weekHistory.sessions]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5)
    .map((s) => {
      // "Completed session" described a revision and new memorization
      // identically, and never said which pages. Both are recoverable
      // from data the engine already had.
      const kind = describeSessionType(s.sessionType);
      return {
        id: s.sessionId,
        type: "session" as const,
        title: s.completed ? `Completed ${kind.toLowerCase()}` : `${kind} in progress`,
        detail: formatPageList(s.pageNumbers) || undefined,
        date: formatDatePreferred(s.startedAt),
        status: s.completed ? ("completed" as const) : ("pending" as const),
      };
    });

  // A single recorded recall is the line between "PHOS has seen you
  // study" and "PHOS is quoting its own opening assumptions back".
  const hasObservedRecall = dashboard.retentionQuality.assessedRecallEvents > 0;

  return {
    session,
    revision,
    revisionAssignments: [SessionType.Recovery, SessionType.Sabqi, SessionType.Manzil].flatMap(
      (type) => {
        const items = allRevisionItems.filter((item) =>
          SESSION_TYPE_WORKLOAD_CATEGORIES[type].some(
            (category) => category === item.workloadCategory,
          ),
        );
        if (!items.length) return [];
        return [
          {
            id: items[0]!.pageId,
            status: "not_started" as const,
            assignment: {
              type: toRevisionType(items[0]!.workloadCategory),
              pages: items.map((item) => `Page ${item.pageNumber}`),
              totalPages: items.length,
              juzCovered: [...new Set(items.map((item) => item.juzNumber))].sort((a, b) => a - b),
            },
            progress: { current: 0, total: items.length },
            estimatedTime: formatEstimatedTime(
              items.reduce((sum, item) => sum + item.estimatedDuration, 0),
            ),
          },
        ];
      },
    ),
    stats: {
      memorizedPages: dashboard.dashboardStatistics.totalPagesMemorized,
      // All revision work scheduled today, across every category — this
      // stat is labelled "Pages scheduled for today", not "this
      // assignment".
      revisionQueue: allRevisionItems.length,
      weeklyProgress: weeklyProgressPercent,
    },
    // Both scores are withheld until PHOS has actually observed a
    // recall. Memory Health is computed from each page's strength and
    // stability — which, straight after onboarding, are values PHOS
    // *assumed* from the user's own estimate of what they had already
    // memorized. Rendering "45%" there presents an assumption as a
    // measurement, on the screen the user most trusts. Both cards
    // already have an honest "Not enough data yet" state; `undefined`
    // is what selects it.
    memoryHealth: hasObservedRecall ? dashboard.memoryHealth.score : undefined,
    retentionQuality: hasObservedRecall ? dashboard.retentionQuality.score : undefined,
    weeklyProgress,
    recentActivity,
    // Passed straight through from the Adaptive Engine. Requirement 4
    // demands explanations "match actual adaptive-engine decisions", so
    // the adapter deliberately does no rewording of its own — any
    // rephrasing here would be a second, unverified account of why the
    // plan looks as it does.
    planExplanation: {
      headline: plan.explanation.headline,
      details: [...plan.explanation.details],
    },
    welcomeBackMessage: plan.returnAssessment.welcomeBackMessage,
    workloadWarning: plan.workloadWarning?.message ?? null,
    goal: goalProjection ? toGoalCard(goalProjection) : null,
    /*
     * The week just gone, from the Analytics Engine's own weekly
     * report. `trendDirection` and `summary` are passed through
     * verbatim for the same reason the plan explanation is: a second,
     * unverified account of the user's progress is worse than none.
     */
    weeklyReview: {
      pagesCompleted: weekHistory.sessions
        .filter((session) => session.sessionType === SessionType.Sabaq)
        .reduce(
          (sum, session) =>
            sum +
            (session.dailyActivity?.reduce((total, day) => total + day.pagesCompleted, 0) ??
              session.pagesCompleted),
          0,
        ),
      sessionsCompleted: dashboard.weeklyProgress.completedSessions,
      recallsRecorded: dashboard.weeklyProgress.recallEvents,
      recallTrend: weekTrend.trendDirection,
      trendSummary: weekTrend.summary,
    } satisfies WeeklyReviewDTO,
  };
}
