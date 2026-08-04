import type { ConfidenceLevel, SessionType } from "@/shared/types";
import { generateCorrelationId } from "@/shared/utils";
import { validateIdentifier, validateNumericRange } from "@/validators";
import {
  toActiveSessionDTO,
  toDailyStudyPlanDTO,
  toSessionStartResponseDTO,
  toSessionSummaryDTO,
} from "@/shared/mappers";
import type {
  ActiveSessionDTO,
  ConfidenceSubmissionResponseDTO,
  DailyStudyPlanDTO,
  RecallSubmissionResponseDTO,
  SessionStartResponseDTO,
  SessionSummaryDTO,
} from "@/shared/dto";
import { container } from "../container";

/**
 * The session currently in progress, or `null`.
 *
 * Answers "is a session actually open?" from persisted rows rather than
 * from any in-memory state, so the answer survives a page reload. The
 * client uses it to reconcile its own cached assignment: if this
 * returns `null`, that cache is stale and is discarded rather than
 * leaving the user with a session they can neither continue nor finish.
 */
export async function getActiveSession(): Promise<ActiveSessionDTO | null> {
  const active = await container.learningEngine.findActiveSession();
  if (!active) return null;
  return toActiveSessionDTO(active.session, active.completedPageIds);
}

/**
 * Today's plan. Retrieval only — does not start a session or mutate
 * anything.
 *
 * `availableStudyMinutes` is still validated: it comes from the user's
 * stored settings, so a corrupted or hand-edited value would otherwise
 * reach the Adaptive Engine as a study budget of `NaN`.
 */
export async function getTodayPlan(availableStudyMinutes: number): Promise<DailyStudyPlanDTO> {
  const correlationId = generateCorrelationId();
  const minutes = validateNumericRange(
    availableStudyMinutes,
    "availableStudyMinutes",
    { min: 1, max: 24 * 60 },
    correlationId,
  );

  return toDailyStudyPlanDTO(await container.adaptiveEngine.generateDailyPlan(minutes));
}

export async function startSession(
  sessionType: SessionType,
  availableStudyMinutes: number,
): Promise<SessionStartResponseDTO> {
  const correlationId = generateCorrelationId();
  const minutes = validateNumericRange(
    availableStudyMinutes,
    "availableStudyMinutes",
    { min: 1, max: 24 * 60 },
    correlationId,
  );

  const session = await container.learningEngine.startSession(sessionType);
  const plan = await container.learningEngine.loadDailyPlan(minutes);

  return toSessionStartResponseDTO(session, plan);
}

export interface RecallSubmission {
  readonly sessionId: string;
  readonly pageId: string;
  readonly successfulRecall: boolean;
  readonly durationSeconds: number;
}

/**
 * Records a recall attempt against the active session.
 *
 * `sessionId` is honoured rather than validated and discarded: it lets
 * the engine rehydrate from persisted state when this page has lost its
 * in-memory session (a reload, a crash, a second tab). Without it, a
 * client that still believed a session was in progress could never
 * finish it.
 *
 * The ids are validated because they come from `localStorage`, which
 * can hold a stale or edited value.
 */
export async function submitRecall(
  submission: RecallSubmission,
): Promise<RecallSubmissionResponseDTO> {
  const correlationId = generateCorrelationId();
  const sessionId = validateIdentifier(submission.sessionId, "sessionId", correlationId);
  const pageId = validateIdentifier(submission.pageId, "pageId", correlationId);
  const durationSeconds = validateNumericRange(
    submission.durationSeconds,
    "durationSeconds",
    { min: 0, max: 3600 },
    correlationId,
  );

  await container.learningEngine.ensureActiveSession(sessionId);
  container.learningEngine.submitRecall(pageId, submission.successfulRecall, durationSeconds);

  // The Memory Engine has not run yet — confidence is collected after
  // recall (SDS Part 12), and only `submitConfidence()` triggers the
  // actual memory update. `updatedMemoryState` therefore reflects the
  // page's *current* persisted state, not yet affected by this attempt.
  const profile = await container.memoryEngine.getCurrentMemoryProfile(pageId);
  const nextStudyItemAvailable = container.learningEngine.getNextStudyItem() !== null;

  return {
    accepted: true,
    updatedMemoryState: profile.memoryState,
    nextStudyItemAvailable,
  };
}

export interface ConfidenceSubmission {
  readonly sessionId: string;
  readonly pageId: string;
  readonly confidence: ConfidenceLevel;
}

export async function submitConfidence(
  submission: ConfidenceSubmission,
): Promise<ConfidenceSubmissionResponseDTO> {
  const correlationId = generateCorrelationId();
  const sessionId = validateIdentifier(submission.sessionId, "sessionId", correlationId);

  await container.learningEngine.ensureActiveSession(sessionId);

  // Combines with the pending recall staged by `submitRecall`, invokes
  // the Memory Engine, and persists the result.
  await container.learningEngine.submitConfidence(submission.confidence);

  return { accepted: true };
}

/** Closes a named session, keeping whatever it recorded. */
export async function finishSession(sessionId: string): Promise<SessionSummaryDTO> {
  const correlationId = generateCorrelationId();
  const id = validateIdentifier(sessionId, "sessionId", correlationId);

  await container.learningEngine.ensureActiveSession(id);
  return toSessionSummaryDTO(await container.learningEngine.finishSession());
}
