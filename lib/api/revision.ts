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
  REVISION_ASSIGNMENT_KEY,
  type CompletionProgress,
  type WeakPageIds,
} from "./activeSession";
import { SESSION_TYPE_WORKLOAD_CATEGORIES } from "@/engines/learning/constants";
import { SessionType, WorkloadCategory } from "@/shared/types";
import type { RevisionDTO, RevisionType } from "@/types/dto";

const ASSIGNMENT_KEY = REVISION_ASSIGNMENT_KEY;
// The daily study budget now comes from the user's onboarding
// answer rather than a fixed hour (PRODUCT_REQUIREMENTS
// Requirement 1). Read per call so a change in Settings applies to
// the next plan without a reload.

/** The session types that Revision covers — everything except new memorization. */
const REVISION_SESSION_TYPES: readonly SessionType[] = [
  SessionType.Recovery,
  SessionType.Sabqi,
  SessionType.Manzil,
];

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

/** Maps a revision item's workload category onto the SessionType a session is started with. */
function toBackendSessionType(workloadCategory: string): SessionType {
  if (workloadCategory === WorkloadCategory.Recovery) return SessionType.Recovery;
  if (workloadCategory === WorkloadCategory.LongTermRevision) return SessionType.Manzil;
  return SessionType.Sabqi;
}

/** The frontend's revision label for a whole session type. */
function revisionTypeForSessionType(sessionType: SessionType): RevisionType {
  if (sessionType === SessionType.Recovery) return "recovery";
  if (sessionType === SessionType.Manzil) return "manzil";
  return "sabqi";
}

/**
 * One revision assignment: the highest-priority revision work scheduled
 * today, narrowed to a single `SessionType`.
 */
interface RevisionAssignment {
  readonly items: readonly BackendStudyItem[];
  readonly sessionType: SessionType;
  readonly revisionType: RevisionType;
}

/**
 * Selects today's revision assignment.
 *
 * A `Session` is always started with one `SessionType`, and the
 * Learning Engine scopes the plan it loads to exactly that type's
 * workload categories (see `engines/learning/constants`). So the
 * assignment presented here must be scoped the same way — otherwise the
 * pages submitted on completion would not match the pages the engine
 * expects, and the session would be rejected part-way through.
 *
 * The highest-priority revision item decides which type the assignment
 * is (Recovery outranks overdue/recent Sabqi work, which outranks
 * long-term Manzil work). Any remaining revision work in the other
 * categories simply becomes the next assignment once this one is done.
 */
async function fetchTodayRevisionAssignment(
  ofSessionType?: SessionType,
): Promise<RevisionAssignment | null> {
  const plan = await sessionOps.getTodayPlan(await getDailyStudyMinutes());
  const revisionItems = plan.studyItems.filter(
    (item) => item.workloadCategory !== WorkloadCategory.NewMemorization,
  );

  const sessionType =
    ofSessionType ??
    (revisionItems[0] ? toBackendSessionType(revisionItems[0].workloadCategory) : undefined);
  if (!sessionType) {
    return null;
  }

  const scopeCategories: readonly string[] = SESSION_TYPE_WORKLOAD_CATEGORIES[sessionType];
  const items = revisionItems.filter((item) => scopeCategories.includes(item.workloadCategory));
  if (items.length === 0 && !ofSessionType) {
    return null;
  }

  return { items, sessionType, revisionType: revisionTypeForSessionType(sessionType) };
}

/**
 * Current Revision data.
 *
 * In-progress state comes from the persisted session row, not from
 * local storage, so it survives a reload — see
 * `lib/api/activeSession.ts`.
 *
 * Returns `null` when there is nothing to revise today and no revision
 * session is in progress — a legitimate state, not an error or a
 * completed session — matching `RevisionPage`'s existing `if (!data)
 * return <RevisionEmpty />` path.
 */
export async function getRevision(): Promise<RevisionDTO | null> {
  const active = await fetchActiveSession();

  if (active && REVISION_SESSION_TYPES.includes(active.sessionType)) {
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
        : ((await fetchTodayRevisionAssignment(active.sessionType))?.items ?? []).map((item) => ({
            pageId: item.pageId,
            pageNumber: item.pageNumber,
          }));

    const pageNumbers = studyPages.map((page) => page.pageNumber);

    return {
      id: active.sessionId,
      status: "in_progress",
      title: "Revision Session",
      assignment: {
        type: revisionTypeForSessionType(active.sessionType),
        pages: pageNumbers.map((n) => `Page ${n}`),
        totalPages: Math.max(pageNumbers.length, active.completedPageIds.length),
      },
      studyPages,
      progress: {
        current: active.completedPageIds.length,
        total: Math.max(pageNumbers.length, active.completedPageIds.length),
      },
      estimatedTime: "—",
    };
  }

  // No revision session is open, so any local record is stale — drop it
  // rather than letting it strand the UI.
  clearAssignment(ASSIGNMENT_KEY);

  const assignment = await fetchTodayRevisionAssignment();
  if (!assignment) {
    return null;
  }

  const { items, revisionType } = assignment;
  const first = items[0];
  if (!first) {
    return null;
  }

  return {
    id: first.pageId,
    status: "not_started",
    title: "Revision Session",
    assignment: {
      type: revisionType,
      pages: items.map((item) => `Page ${item.pageNumber}`),
      totalPages: items.length,
    },
    studyPages: items.map(toStudyPage),
    progress: { current: 0, total: items.length },
    estimatedTime: formatEstimatedTime(
      items.reduce((sum, item) => sum + item.estimatedDuration, 0),
    ),
  };
}

/** Starts a session for today's revision assignment. */
export async function startRevision(): Promise<void> {
  const assignment = await fetchTodayRevisionAssignment();
  if (!assignment || assignment.items.length === 0) {
    throw new Error("No revision is scheduled today.");
  }

  const { items, sessionType } = assignment;
  const result = await sessionOps.startSession(sessionType, await getDailyStudyMinutes());

  writeAssignment(ASSIGNMENT_KEY, {
    sessionId: result.sessionId,
    pageIds: items.map((i) => i.pageId),
    pageNumbers: items.map((i) => i.pageNumber),
  });
}

/**
 * Completes the active revision: records a recall for every page still
 * outstanding, then closes the session. Resumable — see
 * `submitRemainingPages()`.
 */
export async function completeRevision(
  onProgress?: (progress: CompletionProgress) => void,
  weakPageIds: WeakPageIds = new Set(),
): Promise<void> {
  const active = await fetchActiveSession();
  if (!active || !REVISION_SESSION_TYPES.includes(active.sessionType)) {
    clearAssignment(ASSIGNMENT_KEY);
    throw new Error("No revision session is currently in progress.");
  }

  const cached = readAssignment(ASSIGNMENT_KEY);
  const pageIds =
    cached?.sessionId === active.sessionId
      ? cached.pageIds
      : ((await fetchTodayRevisionAssignment(active.sessionType))?.items ?? []).map(
          (item) => item.pageId,
        );

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

/** Stops the revision now, keeping whatever was recorded. See `finishSessionLater()` in session.ts. */
export async function finishRevisionLater(): Promise<void> {
  const active = await fetchActiveSession();
  if (active && REVISION_SESSION_TYPES.includes(active.sessionType)) {
    await finishActiveSession(active.sessionId);
  }
  clearAssignment(ASSIGNMENT_KEY);
}
