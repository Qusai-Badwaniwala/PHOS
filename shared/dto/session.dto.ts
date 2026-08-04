export interface SessionStartRequestDTO {
  readonly sessionType: string;
  readonly availableStudyMinutes: number;
}

export interface SessionStartResponseDTO {
  readonly sessionId: string;
  readonly sessionType: string;
  readonly estimatedDuration: number;
  readonly studyItemCount: number;
}

/** "The DTO contains presentation information only" (SDS Part 16). */
export interface StudyItemDTO {
  readonly pageId: string;
  readonly pageNumber: number;
  readonly memoryState: string;
  /**
   * Which workload category the Adaptive Engine assigned this page
   * (`NewMemorization`, `RecentRevision`, `OverdueRevision`,
   * `LongTermRevision`, `Recovery`).
   *
   * This is presentation information, not an engine internal: the whole
   * Session/Revision split in the UI is derived from it. It was
   * previously absent from this DTO while the frontend filtered on it
   * anyway, which silently sent every scheduled page to Revision and
   * left Session permanently empty.
   */
  readonly workloadCategory: string;
  /** Which of the 30 Juz this page belongs to. Presentation context: "Page 53" alone tells the user nothing. */
  readonly juzNumber: number;
  readonly recommendedOrder: number;
  readonly estimatedDuration: number;
}

/**
 * The response shape of `GET /session/today`.
 *
 * Named rather than an inline object literal in the route handler, so
 * that the frontend adapter layer consumes a real, shared contract
 * instead of re-declaring its own guess at the shape (which is how
 * `workloadCategory` went missing without any compiler complaint).
 */
/** Why today's plan looks the way it does (PRODUCT_REQUIREMENTS Requirement 4). */
export interface PlanExplanationDTO {
  readonly headline: string;
  readonly details: readonly string[];
}

/** How long the user has been away and how the plan responded (Requirement 5). */
export interface ReturnAssessmentDTO {
  readonly status: string;
  readonly daysSinceLastSession: number | null;
  readonly newMemorizationAllowance: number;
  readonly welcomeBackMessage: string | null;
}

/** Today's new-memorization target and the evidence behind it (Requirements 3, 7, 8). */
export interface WorkloadSummaryDTO {
  readonly recommendedNewPages: number;
  readonly basis: string;
  readonly successRate: number | null;
  readonly observedDailyPace: number | null;
  readonly consistency: number | null;
  readonly direction: string;
  readonly rationale: string;
}

/** A notice that today's plan is unusually heavy (Requirement 7). */
export interface WorkloadWarningDTO {
  readonly estimatedMinutes: number;
  readonly availableMinutes: number;
  readonly deferrablePages: number;
  readonly message: string;
}

export interface DailyStudyPlanDTO {
  readonly studyItems: readonly StudyItemDTO[];
  readonly estimatedTotalDurationSeconds: number;
  readonly recoveryRecommended: boolean;
  readonly explanation: PlanExplanationDTO;
  readonly returnAssessment: ReturnAssessmentDTO;
  readonly workload: WorkloadSummaryDTO;
  /** `null` unless today is unusually heavy. */
  readonly workloadWarning: WorkloadWarningDTO | null;
}

export interface RecallSubmissionRequestDTO {
  readonly sessionId: string;
  readonly pageId: string;
  readonly successfulRecall: boolean;
  readonly durationSeconds: number;
}

export interface RecallSubmissionResponseDTO {
  readonly accepted: boolean;
  readonly updatedMemoryState: string;
  readonly nextStudyItemAvailable: boolean;
}

export interface ConfidenceSubmissionRequestDTO {
  readonly sessionId: string;
  readonly pageId: string;
  readonly confidence: string;
}

export interface ConfidenceSubmissionResponseDTO {
  readonly accepted: boolean;
}

/**
 * `POST /session/finish` names the session it is finishing.
 *
 * It previously took no body at all and completed whichever session
 * happened to be in the engine's memory — which meant it could not be
 * used at all once that memory was lost, and in principle could complete
 * the wrong session.
 */
export interface SessionFinishRequestDTO {
  readonly sessionId: string;
}

/** `GET /session/active` — the session in progress according to persisted state. */
export interface ActiveSessionDTO {
  readonly sessionId: string;
  readonly sessionType: string;
  readonly startedAt: string;
  /** Pages already completed within this session, so a client can resume mid-way. */
  readonly completedPageIds: readonly string[];
}

/** "The Session Summary shall not include computed analytics" (SDS Part 16). */
export interface SessionSummaryDTO {
  readonly sessionId: string;
  readonly sessionType: string;
  readonly pagesCompleted: number;
  readonly totalRecallEvents: number;
  readonly durationSeconds: number;
  readonly completedAt: string;
}
