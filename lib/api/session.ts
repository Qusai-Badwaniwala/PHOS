import { sessionOps } from "@/client/operations";
import { surahsOnPage } from "@/shared/constants";
import { getDailyStudyMinutes } from "./settings";
import type { BackendStudyItem } from "./wire";
import {
  clearAssignment,
  fetchActiveSession,
  finishActiveSession,
  readAssignment,
  submitRemainingPages,
  writeAssignment,
  SESSION_ASSIGNMENT_KEY,
  type CompletionProgress,
  type WeakPageIds,
} from "./activeSession";
import { SessionType, WorkloadCategory } from "@/shared/types";
import type { SessionDTO } from "@/types/dto";

const ASSIGNMENT_KEY = SESSION_ASSIGNMENT_KEY;
// The daily study budget now comes from the user's onboarding
// answer rather than a fixed hour (PRODUCT_REQUIREMENTS
// Requirement 1). Read per call so a change in Settings applies to
// the next plan without a reload.

/**
 * Adds surah context to a page.
 *
 * A page number alone is a poor description of surah-dense work: page
 * 602 carries Quraysh, Al-Ma'un and Al-Kawthar, and nobody thinks of
 * that day as "two-thirds of page 602". Attaching the surahs lets the
 * UI name the work the way the user would.
 */
function toStudyPage(item: { pageId: string; pageNumber: number; juzNumber: number }) {
  return {
    pageId: item.pageId,
    pageNumber: item.pageNumber,
    juzNumber: item.juzNumber,
    surahs: surahsOnPage(item.pageNumber).map((surah) => ({
      name: surah.name,
      arabicName: surah.arabicName,
    })),
  };
}

function formatEstimatedTime(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

async function fetchTodayNewMemorizationItems(): Promise<readonly BackendStudyItem[]> {
  const plan = await sessionOps.getTodayPlan(await getDailyStudyMinutes());
  // Compared against the shared `WorkloadCategory` enum rather than a
  // bare string literal, so a rename in the engine becomes a compile
  // error here instead of a silently empty filter.
  return plan.studyItems.filter(
    (item) => item.workloadCategory === WorkloadCategory.NewMemorization,
  );
}

/**
 * Current Session (new-memorization) data.
 *
 * "Session" here maps to the `NewMemorization` workload category from
 * today's Daily Study Plan — see `docs/integration-review.md`
 * "Frontend/backend DTO boundary" for why the UI's Session/Revision
 * split maps onto the Adaptive Engine's single unified plan this way.
 *
 * In-progress state comes from the persisted session row, not from
 * local storage, so it survives a reload. The local assignment cache is
 * used only to label the pages; if it is missing or belongs to a
 * different session, the remaining work is re-derived from today's plan
 * instead.
 *
 * Returns `null` when there is no new memorization scheduled today and
 * no Sabaq session in progress — a legitimate, expected state, not an
 * error and not a completed session. Matches `SessionPage`'s existing
 * `if (!data) return <SessionEmpty />` path.
 */
export async function getSession(): Promise<SessionDTO | null> {
  const active = await fetchActiveSession();

  if (active && active.sessionType === SessionType.Sabaq) {
    const cached = readAssignment(ASSIGNMENT_KEY);
    const studyPages =
      cached?.sessionId === active.sessionId
        ? cached.pageIds.map((pageId, index) => {
            const pageNumber = cached.pageNumbers[index] ?? 0;
            return {
              pageId,
              pageNumber,
              surahs: surahsOnPage(pageNumber).map((surah) => ({
                name: surah.name,
                arabicName: surah.arabicName,
              })),
            };
          })
        : // Cache lost (cleared storage, another browser). Rebuild what
          // we can: the pages still outstanding for this session.
          (await fetchTodayNewMemorizationItems()).map((item) => ({
            pageId: item.pageId,
            pageNumber: item.pageNumber,
          }));

    const pageNumbers = studyPages.map((page) => page.pageNumber);
    const first = pageNumbers[0];
    const last = pageNumbers[pageNumbers.length - 1];
    const total = Math.max(pageNumbers.length, active.completedPageIds.length);

    return {
      id: active.sessionId,
      status: "in_progress",
      title: "Memorization Session",
      assignment: {
        startPage: first,
        endPage: last,
        target:
          first === undefined
            ? "In progress"
            : `Page ${first}${last !== undefined && pageNumbers.length > 1 ? `–${last}` : ""}`,
      },
      studyPages,
      progress: { current: active.completedPageIds.length, total },
      estimatedTime: "—",
    };
  }

  // No Sabaq session is open, so any local record is stale — drop it
  // rather than letting it strand the UI.
  clearAssignment(ASSIGNMENT_KEY);

  // A session of another type being open is surfaced by startSession()
  // rather than here, so the user still sees today's assignment.
  const items = await fetchTodayNewMemorizationItems();
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    return null;
  }

  return {
    id: first.pageId,
    status: "not_started",
    title: "Memorization Session",
    assignment: {
      startPage: first.pageNumber,
      endPage: last.pageNumber,
      target: `Page ${first.pageNumber}${items.length > 1 ? `–${last.pageNumber}` : ""}`,
    },
    studyPages: items.map(toStudyPage),
    progress: { current: 0, total: items.length },
    estimatedTime: formatEstimatedTime(
      items.reduce((sum, item) => sum + item.estimatedDuration, 0),
    ),
  };
}

/**
 * Starts a session for today's new-memorization assignment and caches
 * the page list so it can be labelled after a reload.
 */
export async function startSession(): Promise<void> {
  const items = await fetchTodayNewMemorizationItems();
  if (items.length === 0) {
    throw new Error("No memorization assignment is scheduled today.");
  }

  const result = await sessionOps.startSession(SessionType.Sabaq, await getDailyStudyMinutes());

  writeAssignment(ASSIGNMENT_KEY, {
    sessionId: result.sessionId,
    pageIds: items.map((i) => i.pageId),
    pageNumbers: items.map((i) => i.pageNumber),
  });
}

/**
 * Completes the active session: records a recall for every page still
 * outstanding, then closes the session.
 *
 * Resumable — pages already recorded are skipped, so a completion
 * interrupted part-way can simply be retried.
 *
 * Pages the user flagged as shaky are recorded as a failed recall with
 * `Low` confidence; the rest as a success with `High`. See
 * `submitRemainingPages()` for why "flag only the exceptions" is the
 * input model.
 */
export async function completeSession(
  onProgress?: (progress: CompletionProgress) => void,
  weakPageIds: WeakPageIds = new Set(),
): Promise<void> {
  const active = await fetchActiveSession();
  if (!active || active.sessionType !== SessionType.Sabaq) {
    clearAssignment(ASSIGNMENT_KEY);
    throw new Error("No memorization session is currently in progress.");
  }

  const cached = readAssignment(ASSIGNMENT_KEY);
  const pageIds =
    cached?.sessionId === active.sessionId
      ? cached.pageIds
      : (await fetchTodayNewMemorizationItems()).map((item) => item.pageId);

  await submitRemainingPages(
    active.sessionId,
    pageIds,
    active.completedPageIds,
    onProgress,
    weakPageIds,
  );
  await finishActiveSession(active.sessionId);
  clearAssignment(ASSIGNMENT_KEY);
}

/**
 * Stops the session now, keeping whatever was recorded.
 *
 * The session is closed rather than abandoned: an open row would remain
 * "the active session" indefinitely and block the next one from
 * starting. Pages that were never studied stay unstudied and are
 * rescheduled normally — "completed work remains persisted; incomplete
 * work remains incomplete".
 */
export async function finishSessionLater(): Promise<void> {
  const active = await fetchActiveSession();
  if (active && active.sessionType === SessionType.Sabaq) {
    await finishActiveSession(active.sessionId);
  }
  clearAssignment(ASSIGNMENT_KEY);
}
