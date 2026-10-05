import type {
  ActiveSessionProgress,
  DailyStudyPlan,
  MemoryUpdateResult,
  Session,
  SessionSummary,
  SessionType,
  StudyItem,
  ConfidenceLevel,
} from "@/shared/types";

/**
 * Public contract of the Learning Engine (SDS Part 12 "PUBLIC
 * INTERFACE"). Method order matches the SDS's listed session lifecycle.
 */
export interface ILearningEngine {
  startSession(sessionType: SessionType): Promise<Session>;
  loadDailyPlan(
    availableStudyMinutes: number,
    options?: { extraNewMemorization?: boolean },
  ): Promise<DailyStudyPlan>;
  getNextStudyItem(): StudyItem | null;
  /** Records the objective recall outcome. Confidence has not been supplied yet, so nothing is persisted or sent to the Memory Engine until `submitConfidence()` (SDS Part 12: "Confidence is collected after recall"). */
  submitRecall(pageId: string, successfulRecall: boolean, durationSeconds: number): void;
  /** Combines the pending recall with confidence, invokes the Memory Engine, and persists the result. */
  submitConfidence(confidence: ConfidenceLevel): Promise<MemoryUpdateResult>;
  completeStudyItem(pageId: string): Promise<void>;
  advanceSession(): StudyItem | null;
  generateSessionSummary(): Promise<SessionSummary>;
  finishSession(): Promise<SessionSummary>;
  cancelSession(): Promise<void>;
  resumeSession(sessionId: string): Promise<Session>;
  /** Guarantees `sessionId` is loaded, rehydrating from persisted state after a restart. No-op if already active. */
  ensureActiveSession(sessionId: string, availableStudyMinutes?: number): Promise<void>;
  /** The session in progress according to persisted state, with the pages already done in it, or `null`. */
  findActiveSession(): Promise<ActiveSessionProgress | null>;
  /**
   * Drops this engine's in-memory session state without touching the
   * database.
   *
   * Required because the engine caches the active session, its plan
   * and the cursor position (see the class doc comment). When rows are
   * replaced underneath it — a restore, or a full data reset — that
   * cache would otherwise still reference sessions and pages that no
   * longer exist, and the next call would act on them. This does not
   * complete or cancel a session; it only forgets one, which is the
   * correct behaviour when the session it described has ceased to
   * exist.
   */
  discardInMemoryState(): void;
}
