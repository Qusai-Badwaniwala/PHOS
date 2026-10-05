import { sessionOps } from "@/client/operations";
import { ConfidenceLevel, type SessionType } from "@/shared/types";

/**
 * Shared session-lifecycle plumbing for the Session and Revision
 * adapters.
 *
 * The persisted `Session` row is the single source of truth for "a
 * session is in progress". Local storage is only a cache of which pages
 * the assignment contained, because a Daily Study Plan is never
 * persisted.
 *
 * This matters because session progress lives in the Learning Engine's
 * memory, which the browser loses on reload. Previously the UI trusted
 * its own local record unconditionally, so a lost engine state left it
 * insisting a session was in progress while nothing backed that up —
 * every action failed and there was no way out. Now it asks the engine,
 * and discards its own record when the engine disagrees.
 */

export interface ActiveSession {
  readonly sessionId: string;
  readonly sessionType: SessionType;
  readonly startedAt: string;
  /** Pages already recorded against this session, so completion can resume rather than replay. */
  readonly completedPageIds: readonly string[];
  readonly studyDraft?: import("@/shared/types").StudyDraft;
}

/** The assignment a client committed to. Cached locally; never authoritative. */
export interface AssignmentCache {
  readonly sessionId: string;
  readonly pageIds: readonly string[];
  readonly pageNumbers: readonly number[];
}

/** Asks the engine whether a session is genuinely open. */
export async function fetchActiveSession(): Promise<ActiveSession | null> {
  const active = await sessionOps.getActiveSession();
  if (!active) return null;

  return {
    sessionId: active.sessionId,
    // The DTO widens `sessionType` to `string` for the client boundary;
    // it can only ever hold a `SessionType`, since it is written from
    // one by `toActiveSessionDTO`.
    sessionType: active.sessionType as SessionType,
    startedAt: active.startedAt,
    completedPageIds: active.completedPageIds,
    studyDraft: active.studyDraft,
  };
}

export function readAssignment(storageKey: string): AssignmentCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as AssignmentCache) : null;
  } catch {
    return null;
  }
}

export function writeAssignment(storageKey: string, cache: AssignmentCache): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cache));
  } catch {
    // Storage can legitimately fail (private browsing, quota). The
    // session still works — the server holds the real state — the client
    // just has to re-derive the page list. Safe degradation, not a crash.
  }
}

export function clearAssignment(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // See writeAssignment().
  }
}

/**
 * Storage keys for the cached page list of each kind of study session.
 *
 * Declared here rather than in `session.ts`/`revision.ts` so that
 * operations affecting *all* cached assignments — a data reset, a
 * restore — cannot silently miss one when a third kind is added.
 */
export const SESSION_ASSIGNMENT_KEY = "phos:active-session";
export const REVISION_ASSIGNMENT_KEY = "phos:active-revision";

/**
 * Forgets every cached assignment.
 *
 * The cache holds the page list of a session the server has just
 * stopped knowing about (after a data reset, restore or import).
 * Leaving it in place would let the client offer to resume a session
 * whose rows no longer exist.
 */
export function clearAllAssignments(): void {
  clearAssignment(SESSION_ASSIGNMENT_KEY);
  clearAssignment(REVISION_ASSIGNMENT_KEY);
}

/** Reported after each page so the UI can show real progress during a long completion. */
export interface CompletionProgress {
  readonly completed: number;
  readonly total: number;
}

export type StudyReceipt = import("@/shared/dto").SessionSummaryDTO & { weakPages: number };
export async function getStudyReceipt(sessionId: string): Promise<StudyReceipt> {
  return sessionOps.getStudyReceipt(sessionId);
}
export function committedAssignment(active: ActiveSession, key: string): AssignmentCache | null {
  return active.studyDraft?.items
    ? {
        sessionId: active.sessionId,
        pageIds: active.studyDraft.items.map((item) => item.pageId),
        pageNumbers: active.studyDraft.items.map((item) => item.pageNumber),
      }
    : readAssignment(key);
}

/**
 * Pages the user marked as having felt shaky.
 *
 * The recall input model, chosen deliberately: pages default to a
 * successful recall and the user flags only the ones that did not go
 * well. Asking for an explicit verdict on every page would turn a
 * 20-page revision into 20 forms and get answered carelessly, which
 * would feed the Memory Engine worse data than assuming success.
 * Flagging is low-effort and is the case worth capturing, because a
 * struggling page is what the engine most needs to know about.
 */
export type WeakPageIds = ReadonlySet<string>;

/** Estimated seconds per page when the page was not individually timed. */
const ASSUMED_SECONDS_PER_PAGE = 60;

/**
 * Records a recall for every page of the assignment that the server has
 * not already recorded, then leaves the session open for the caller to
 * finish.
 *
 * Pages in `weakPageIds` are recorded as a failed recall with `Low`
 * confidence; every other page as a success with `High`. Those are the
 * two things the user actually told PHOS, and nothing is invented in
 * between — a page not flagged means "this went fine", which is a
 * genuine signal, not a default standing in for missing data.
 *
 * Two properties matter here:
 *
 * 1. **Resumable.** Pages already present in `completedPageIds` are
 *    skipped, so an interrupted completion can simply be retried
 *    instead of replaying work — replaying would be rejected anyway,
 *    since the engine advances strictly in order and a completed page is
 *    no longer the current study item.
 * 2. **Fails loudly, not halfway silently.** If a page fails, the error
 *    propagates immediately; everything already recorded stays recorded,
 *    and retrying resumes from that point.
 *
 * Pages are submitted one at a time because the engine's progression is
 * sequential by design — recall and confidence for a page must be
 * accepted before the next page becomes current. Batching would require
 * a new bulk operation and is a possible later optimisation, not a
 * correctness fix.
 */
export async function submitRemainingPages(
  sessionId: string,
  pageIds: readonly string[],
  completedPageIds: readonly string[],
  onProgress?: (progress: CompletionProgress) => void,
  weakPageIds: WeakPageIds = new Set(),
): Promise<void> {
  const alreadyDone = new Set(completedPageIds);
  const remaining = pageIds.filter((pageId) => !alreadyDone.has(pageId));

  let completed = pageIds.length - remaining.length;
  onProgress?.({ completed, total: pageIds.length });

  for (const pageId of remaining) {
    const struggled = weakPageIds.has(pageId);

    await sessionOps.submitRecall({
      sessionId,
      pageId,
      successfulRecall: !struggled,
      durationSeconds: ASSUMED_SECONDS_PER_PAGE,
    });
    await sessionOps.submitConfidence({
      sessionId,
      pageId,
      confidence: struggled ? ConfidenceLevel.Low : ConfidenceLevel.High,
    });

    completed += 1;
    onProgress?.({ completed, total: pageIds.length });
  }
}

/**
 * Closes a session, keeping whatever was recorded.
 *
 * Used both by "Complete" (after every page has been submitted) and by
 * "Finish Later" (after none or only some have). In both cases the
 * honest representation is the same: the session happened, it recorded
 * the pages it recorded, and it is now closed. Pages that were never
 * studied simply remain unstudied and are rescheduled normally.
 *
 * Leaving the row open instead would strand it — it would keep counting
 * as the active session forever and block the next one from starting.
 */
export async function finishActiveSession(
  sessionId: string,
): Promise<import("@/shared/dto").SessionSummaryDTO> {
  return sessionOps.finishSession(sessionId);
}

export async function saveStudyFeedback(
  sessionId: string,
  weakPageIds: ReadonlySet<string>,
  paused: boolean,
): Promise<void> {
  return sessionOps.saveStudyFeedback(sessionId, [...weakPageIds], paused);
}
