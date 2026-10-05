import type { IAdaptiveEngine } from "@/engines/adaptive/interfaces";
import type { IMemoryEngine } from "@/engines/memory";
import type { IPageRepository, IRecallEventRepository, ISessionRepository } from "@/repositories";
import { generateCorrelationId } from "@/shared/utils";
import type {
  ActiveSessionProgress,
  ConfidenceLevel,
  DailyStudyPlan,
  MemoryUpdateResult,
  Session,
  SessionSummary,
  SessionType,
  StudyItem,
  RecallOutcome,
} from "@/shared/types";
import {
  ConfidenceSubmissionError,
  InvalidStudyItemError,
  RecallSubmissionError,
  SessionAlreadyActiveError,
  SessionAlreadyCompletedError,
  SessionCompletionError,
  SessionNotStartedError,
} from "./errors";
import type { ILearningEngine } from "./interfaces";
import { isCategoryInSessionScope, SESSION_REHYDRATION_STUDY_MINUTES } from "./constants";
import { validateConfidence, validateRecallSubmission, validateSessionType } from "./validators";

export interface LearningEngineDependencies {
  readonly adaptiveEngine: IAdaptiveEngine;
  readonly memoryEngine: IMemoryEngine;
  readonly sessionRepository: ISessionRepository;
  readonly recallEventRepository: IRecallEventRepository;
  readonly pageRepository: IPageRepository;
  /** Browser composition can commit Memory Engine work and session progress together. */
  readonly commitRecall?: (outcome: RecallOutcome) => Promise<MemoryUpdateResult>;
}

interface PendingRecall {
  readonly pageId: string;
  readonly successfulRecall: boolean;
  readonly durationSeconds: number;
  readonly timestamp: Date;
}

const MILLISECONDS_PER_SECOND = 1000;

/**
 * The Learning Engine (SDS Part 12): the operational controller of
 * PHOS. Orchestrates the session lifecycle by coordinating the
 * Adaptive Engine and Memory Engine — it never calculates memory
 * variables and never generates adaptive schedules itself.
 *
 * State note: this engine holds session progress (current plan,
 * position, and a recall awaiting confidence) as in-memory instance
 * state, deliberately. PHOS is a local-first, single-user, standalone
 * Node.js process (not a stateless serverless deployment), so a
 * single long-lived `LearningEngine` instance — composed once per
 * active session by the API layer's composition root, not
 * re-instantiated per request — is the intended usage. This is called
 * out explicitly because it is a real constraint on how MODULE 09 must
 * wire this engine up.
 */
export class LearningEngine implements ILearningEngine {
  private currentSession: Session | null = null;
  private currentPlan: DailyStudyPlan | null = null;
  private currentItemIndex = 0;
  private pendingRecall: PendingRecall | null = null;

  constructor(private readonly deps: LearningEngineDependencies) {}

  discardInMemoryState(): void {
    this.currentSession = null;
    this.currentPlan = null;
    this.currentItemIndex = 0;
    this.pendingRecall = null;
  }

  async startSession(sessionType: SessionType): Promise<Session> {
    const correlationId = generateCorrelationId();
    validateSessionType(sessionType, correlationId);

    // Only one session may be open at a time. Checked against persisted
    // state rather than this engine's memory, so a session left open by
    // a crash is still detected. Without this, a second start silently
    // orphaned the first session's row — its recorded pages stayed in
    // the database attached to a session that could never be completed.
    const alreadyActive = await this.deps.sessionRepository.findActive();
    if (alreadyActive) {
      throw new SessionAlreadyActiveError(alreadyActive.id, correlationId);
    }

    const session = this.deps.sessionRepository.createActive
      ? await this.deps.sessionRepository.createActive({ sessionType })
      : await this.deps.sessionRepository.create({ sessionType });
    this.currentSession = session;
    this.currentPlan = null;
    this.currentItemIndex = 0;
    this.pendingRecall = null;
    return session;
  }

  async loadDailyPlan(
    availableStudyMinutes: number,
    options: { extraNewMemorization?: boolean } = {},
  ): Promise<DailyStudyPlan> {
    const correlationId = generateCorrelationId();
    this.requireActiveSession(correlationId);

    // Step 1 of SESSION ORCHESTRATION: request the Daily Study Plan
    // from the Adaptive Engine.
    const plan = await this.deps.adaptiveEngine.generateDailyPlan(availableStudyMinutes, options);

    // Step 2: narrow the day's combined plan to the work this session is
    // actually about.
    //
    // The Adaptive Engine deliberately returns one priority-ordered plan
    // covering every category (SDS Part 11), but a Session is always
    // started for one specific SessionType (SDS Part 12). Without this
    // narrowing, `submitRecall()`'s sequential-progression check
    // compares the caller's page against the highest-priority item of
    // the *whole day* — so a Sabaq session would be rejected outright
    // whenever any revision work was also scheduled, because revision
    // always outranks new memorization.
    //
    // Narrowing here rather than inside the Adaptive Engine keeps
    // scheduling (which pages are worth studying today, and in what
    // order) separate from session orchestration (which of those pages
    // belong to the session now in progress). Relative priority order is
    // preserved; only out-of-scope items are removed.
    const scopedPlan = scopePlanToSessionType(plan, this.currentSessionTypeOrThrow(correlationId));

    const committed = this.currentSession?.studyDraft;
    if (committed?.items) {
      const completed = new Set(
        (
          await this.deps.sessionRepository.findSessionItems(
            this.currentSessionIdOrThrow(correlationId),
          )
        ).map((item) => item.pageId),
      );
      const remaining = committed.items
        .filter((item) => !completed.has(item.pageId))
        .map((item, index) => ({ ...item, recommendedOrder: index }));
      this.currentPlan = {
        ...scopedPlan,
        studyItems: remaining,
        estimatedTotalDurationSeconds: remaining.reduce(
          (sum, item) => sum + item.estimatedDurationSeconds,
          0,
        ),
      };
      this.currentItemIndex = 0;
      return this.currentPlan;
    }
    if (this.deps.sessionRepository.saveStudyDraft) {
      const draft = {
        pageIds: scopedPlan.studyItems.map((item) => item.pageId),
        weakPageIds: [],
        paused: false,
        items: [...scopedPlan.studyItems],
      };
      await this.deps.sessionRepository.saveStudyDraft(
        this.currentSessionIdOrThrow(correlationId),
        draft,
      );
      if (this.currentSession) this.currentSession = { ...this.currentSession, studyDraft: draft };
    }

    this.currentPlan = scopedPlan;
    this.currentItemIndex = 0;
    return scopedPlan;
  }

  getNextStudyItem(): StudyItem | null {
    if (!this.currentPlan) {
      return null;
    }
    return this.currentPlan.studyItems[this.currentItemIndex] ?? null;
  }

  submitRecall(pageId: string, successfulRecall: boolean, durationSeconds: number): void {
    const correlationId = generateCorrelationId();
    this.requireActiveSession(correlationId);
    validateRecallSubmission(pageId, durationSeconds, correlationId);

    const currentItem = this.getNextStudyItem();
    if (!currentItem || currentItem.pageId !== pageId) {
      throw new InvalidStudyItemError(
        `Submitted recall for pageId "${pageId}" does not match the current study item; session progression must remain sequential.`,
        correlationId,
      );
    }

    // Confidence is collected after recall (SDS Part 12), so nothing
    // is sent to the Memory Engine or persisted yet — only staged.
    this.pendingRecall = {
      pageId,
      successfulRecall,
      durationSeconds,
      timestamp: new Date(),
    };
  }

  async submitConfidence(confidence: ConfidenceLevel): Promise<MemoryUpdateResult> {
    const correlationId = generateCorrelationId();
    this.requireActiveSession(correlationId);
    validateConfidence(confidence, correlationId);

    if (!this.pendingRecall) {
      throw new ConfidenceSubmissionError(
        "No recall is pending. Call submitRecall() before submitConfidence().",
        correlationId,
      );
    }

    const pending = this.pendingRecall;

    try {
      // The Learning Engine consults PageRepository only to compute
      // elapsed time since the last review — it never reads or writes
      // memory variables itself (those belong exclusively to the
      // Memory Engine).
      const page = await this.deps.pageRepository.findById(pending.pageId);
      const secondsSinceLastReview =
        page?.lastReviewedAt != null
          ? Math.max(
              0,
              Math.round(
                (pending.timestamp.getTime() - page.lastReviewedAt.getTime()) /
                  MILLISECONDS_PER_SECOND,
              ),
            )
          : null;

      // Steps 6-7 of SESSION ORCHESTRATION: invoke the Memory Engine
      // and let it persist the updated profile + RecallEvent. The
      // Learning Engine never bypasses the Memory Engine.
      const outcome: RecallOutcome = {
        pageId: pending.pageId,
        sessionId: this.currentSessionIdOrThrow(correlationId),
        successfulRecall: pending.successfulRecall,
        confidence,
        durationSeconds: pending.durationSeconds,
        secondsSinceLastReview,
        timestamp: pending.timestamp,
      };
      const result = this.deps.commitRecall
        ? await this.deps.commitRecall(outcome)
        : await this.deps.memoryEngine.applyRecallResult(outcome);

      // Step 8: advance to next study item (records session progress).
      if (!this.deps.commitRecall) await this.completeStudyItem(pending.pageId);
      this.advanceSession();

      this.pendingRecall = null;
      return result;
    } catch (error) {
      throw new RecallSubmissionError("Failed to process the pending recall.", correlationId, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async completeStudyItem(pageId: string): Promise<void> {
    const correlationId = generateCorrelationId();
    const sessionId = this.currentSessionIdOrThrow(correlationId);
    await this.deps.sessionRepository.addSessionItem({
      sessionId,
      pageId,
      order: this.currentItemIndex,
    });
  }

  advanceSession(): StudyItem | null {
    this.currentItemIndex += 1;
    return this.getNextStudyItem();
  }

  async generateSessionSummary(): Promise<SessionSummary> {
    const correlationId = generateCorrelationId();
    const sessionId = this.currentSessionIdOrThrow(correlationId);

    const [session, sessionItems, recallEvents] = await Promise.all([
      this.deps.sessionRepository.findById(sessionId),
      this.deps.sessionRepository.findSessionItems(sessionId),
      this.deps.recallEventRepository.findBySession(sessionId),
    ]);

    if (!session) {
      throw new SessionCompletionError(`Session "${sessionId}" could not be found.`, correlationId);
    }

    const durationSeconds =
      session.durationSeconds ??
      Math.max(0, Math.round((Date.now() - session.startedAt.getTime()) / MILLISECONDS_PER_SECOND));

    // This summary is deliberately limited to raw counts and does not
    // compute any long-term analytics — that remains the Analytics
    // Engine's responsibility (SDS Part 12 "SESSION SUMMARY").
    return {
      sessionId: session.id,
      sessionType: session.sessionType,
      pagesCompleted: sessionItems.length,
      totalRecallEvents: recallEvents.length,
      durationSeconds,
      completedAt: session.completedAt ?? new Date(),
    };
  }

  async finishSession(): Promise<SessionSummary> {
    const correlationId = generateCorrelationId();
    const sessionId = this.currentSessionIdOrThrow(correlationId);

    if (this.currentSession?.completedAt) {
      throw new SessionAlreadyCompletedError(sessionId, correlationId);
    }

    try {
      const completedSession = await this.deps.sessionRepository.complete(sessionId);
      this.currentSession = completedSession;
      const summary = await this.generateSessionSummary();

      this.currentSession = null;
      this.currentPlan = null;
      this.currentItemIndex = 0;
      this.pendingRecall = null;

      return summary;
    } catch (error) {
      if (error instanceof SessionAlreadyCompletedError) {
        throw error;
      }
      throw new SessionCompletionError("Failed to finish the session.", correlationId, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Ends the current session without marking it complete (SDS Part 12
   * "INTERRUPTED SESSIONS": "Completed work remains persisted.
   * Incomplete work remains incomplete."). The SDS's schema (MODULE 01)
   * has no separate "cancelled" status; a session left with
   * `completedAt` still null is this engine's chosen representation of
   * "abandoned," distinguishable from a properly finished session
   * without inventing a new persisted field.
   */
  async cancelSession(): Promise<void> {
    this.currentSession = null;
    this.currentPlan = null;
    this.currentItemIndex = 0;
    this.pendingRecall = null;
  }

  /**
   * Resumes a previously interrupted session (SDS Part 12
   * "INTERRUPTED SESSIONS").
   *
   * Known limitation, documented rather than silently assumed: the SDS
   * schema never persists a Daily Study Plan (Part 8 deliberately
   * stores facts, not scheduling), so only session identity and
   * already-completed progress can be restored here. The caller must
   * call `loadDailyPlan()` again afterward to obtain a plan for the
   * remaining work; because Page memory state already reflects the
   * earlier progress, the regenerated plan naturally accounts for it.
   */
  async resumeSession(sessionId: string): Promise<Session> {
    const correlationId = generateCorrelationId();
    const session = await this.deps.sessionRepository.findById(sessionId);
    if (!session) {
      throw new SessionNotStartedError(correlationId, { sessionId });
    }
    if (session.completedAt) {
      throw new SessionAlreadyCompletedError(sessionId, correlationId);
    }

    this.currentSession = session;
    this.currentPlan = null;
    // Deliberately 0, not the count of already-completed items: the
    // caller must call `loadDailyPlan()` next, and the regenerated plan
    // already excludes every page studied today, so it contains only the
    // remaining work and its cursor starts at the beginning.
    this.currentItemIndex = 0;
    this.pendingRecall = null;

    return session;
  }

  /**
   * Guarantees `sessionId` is the session this engine is working on,
   * rehydrating from persisted state when necessary.
   *
   * Session progress is held in memory (see the class doc comment), which
   * is correct for a single-user local process but means a restart,
   * a crash, or a dev-server hot reload silently discards it. Before this
   * existed, a client that still believed a session was in progress could
   * never finish it: every call threw `SessionNotStartedError` with no
   * recovery path, stranding real work — a direct violation of "session
   * state remains recoverable".
   *
   * The persisted `Session` row is the source of truth. This is a no-op
   * on the normal path (the session is already loaded), so it costs
   * nothing when nothing has gone wrong.
   */
  async ensureActiveSession(
    sessionId: string,
    availableStudyMinutes: number = SESSION_REHYDRATION_STUDY_MINUTES,
  ): Promise<void> {
    if (this.currentSession?.id === sessionId && this.currentPlan) {
      return;
    }
    await this.resumeSession(sessionId);
    await this.loadDailyPlan(availableStudyMinutes);
  }

  /**
   * The session currently in progress according to persisted state,
   * together with the pages already completed within it, or `null`.
   *
   * Built from persisted rows rather than this engine's in-memory state,
   * so it remains correct after a restart. Lets a client reconcile its
   * own view of "in progress" against the server instead of trusting
   * local storage, and resume from the right page rather than replaying
   * work already done.
   */
  async findActiveSession(): Promise<ActiveSessionProgress | null> {
    const session = await this.deps.sessionRepository.findActive();
    if (!session) {
      return null;
    }
    const items = await this.deps.sessionRepository.findSessionItems(session.id);
    return { session, completedPageIds: items.map((item) => item.pageId) };
  }

  private requireActiveSession(correlationId: string): void {
    if (!this.currentSession) {
      throw new SessionNotStartedError(correlationId);
    }
  }

  private currentSessionIdOrThrow(correlationId: string): string {
    if (!this.currentSession) {
      throw new SessionNotStartedError(correlationId);
    }
    return this.currentSession.id;
  }

  private currentSessionTypeOrThrow(correlationId: string): SessionType {
    if (!this.currentSession) {
      throw new SessionNotStartedError(correlationId);
    }
    return this.currentSession.sessionType;
  }
}

/**
 * Returns the slice of a Daily Study Plan belonging to one session type
 * (see `SESSION_TYPE_WORKLOAD_CATEGORIES`).
 *
 * `recommendedOrder` is reassigned densely from 0 over the surviving
 * items so the result stays fully, contiguously ordered — the same
 * guarantee the Adaptive Engine gives for the unscoped plan ("the engine
 * shall never return partially ordered plans"). Relative order is
 * untouched, so the Adaptive Engine remains the sole authority on
 * priority. `availableStudyMinutes` is deliberately left as the day's
 * original budget; it describes what the user said they had available,
 * not what this slice consumes.
 */
function scopePlanToSessionType(plan: DailyStudyPlan, sessionType: SessionType): DailyStudyPlan {
  const scopedItems = plan.studyItems
    .filter((item) => isCategoryInSessionScope(sessionType, item.workloadCategory))
    .map((item, index) => ({ ...item, recommendedOrder: index }));

  return {
    ...plan,
    studyItems: scopedItems,
    estimatedTotalDurationSeconds: scopedItems.reduce(
      (total, item) => total + item.estimatedDurationSeconds,
      0,
    ),
  };
}
