import { analyticsOps, sessionOps } from "@/client/operations";
import { getDailyStudyMinutes } from "./settings";
import { primarySurahForPage, surahLabelForRange } from "@/shared/constants";
import { formatDatePreferred } from "@/lib/format";
import { SESSION_TYPE_WORKLOAD_CATEGORIES } from "@/engines/learning/constants";
import { ReportingPeriod, SessionType, WorkloadCategory } from "@/shared/types";
import type { ActivityItemDTO, DashboardDTO, DayProgressDTO, RevisionType } from "@/types/dto";

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
const MILLISECONDS_PER_DAY = 86_400_000;

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
  const [dashboard, plan, weekHistory] = await Promise.all([
    analyticsOps.getDashboard(),
    sessionOps.getTodayPlan(studyMinutes),
    analyticsOps.getHistoricalReport(ReportingPeriod.Weekly),
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
    const dayDate = new Date(today.getTime() - (6 - i) * MILLISECONDS_PER_DAY);
    const completedOnThisDay = weekHistory.sessions.some(
      (s) => s.completed && isSameLocalDay(new Date(s.startedAt), dayDate),
    );
    // getDay() is always 0-6 and DAY_LABELS has exactly 7 entries, so
    // the fallback is unreachable; it exists to satisfy
    // `noUncheckedIndexedAccess` without weakening the check.
    return { day: DAY_LABELS[dayDate.getDay()] ?? "", completed: completedOnThisDay };
  });

  const recentActivity: ActivityItemDTO[] = [...weekHistory.sessions]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5)
    .map((s) => ({
      id: s.sessionId,
      type: "session",
      title: s.completed ? "Completed session" : "Session in progress",
      date: formatDatePreferred(s.startedAt),
      status: s.completed ? "completed" : "pending",
    }));

  // A single recorded recall is the line between "PHOS has seen you
  // study" and "PHOS is quoting its own opening assumptions back".
  const hasObservedRecall = dashboard.retentionQuality.assessedRecallEvents > 0;

  return {
    session,
    revision,
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
  };
}
