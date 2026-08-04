import type {
  DailyStudyPlan,
  MemoryUpdateResult,
  Session,
  SessionSummary,
  StudyItem,
} from "@/shared/types";
import type {
  ActiveSessionDTO,
  DailyStudyPlanDTO,
  RecallSubmissionResponseDTO,
  SessionStartResponseDTO,
  SessionSummaryDTO,
  StudyItemDTO,
} from "@/shared/dto";

export function toStudyItemDTO(item: StudyItem): StudyItemDTO {
  return {
    pageId: item.pageId,
    pageNumber: item.pageNumber,
    memoryState: item.memoryState,
    workloadCategory: item.workloadCategory,
    juzNumber: item.juzNumber,
    recommendedOrder: item.recommendedOrder,
    estimatedDuration: item.estimatedDurationSeconds,
  };
}

/** Maps a Daily Study Plan onto the `GET /session/today` response contract. */
export function toDailyStudyPlanDTO(plan: DailyStudyPlan): DailyStudyPlanDTO {
  return {
    studyItems: plan.studyItems.map(toStudyItemDTO),
    estimatedTotalDurationSeconds: plan.estimatedTotalDurationSeconds,
    recoveryRecommended: plan.recoveryRecommended,
    explanation: {
      headline: plan.explanation.headline,
      details: plan.explanation.details,
    },
    returnAssessment: {
      status: plan.returnAssessment.status,
      daysSinceLastSession: plan.returnAssessment.daysSinceLastSession,
      newMemorizationAllowance: plan.returnAssessment.newMemorizationAllowance,
      welcomeBackMessage: plan.returnAssessment.welcomeBackMessage,
    },
    workload: {
      recommendedNewPages: plan.workload.recommendedNewPages,
      basis: plan.workload.basis,
      successRate: plan.workload.successRate,
      observedDailyPace: plan.workload.observedDailyPace,
      consistency: plan.workload.consistency,
      direction: plan.workload.direction,
      rationale: plan.workload.rationale,
    },
    workloadWarning: plan.workloadWarning
      ? {
          estimatedMinutes: plan.workloadWarning.estimatedMinutes,
          availableMinutes: plan.workloadWarning.availableMinutes,
          deferrablePages: plan.workloadWarning.deferrablePages,
          message: plan.workloadWarning.message,
        }
      : null,
  };
}

export function toSessionStartResponseDTO(
  session: Session,
  plan: DailyStudyPlan,
): SessionStartResponseDTO {
  return {
    sessionId: session.id,
    sessionType: session.sessionType,
    estimatedDuration: plan.estimatedTotalDurationSeconds,
    studyItemCount: plan.studyItems.length,
  };
}

export function toRecallSubmissionResponseDTO(
  result: MemoryUpdateResult,
  nextStudyItemAvailable: boolean,
): RecallSubmissionResponseDTO {
  return {
    accepted: true,
    updatedMemoryState: result.updatedProfile.memoryState,
    nextStudyItemAvailable,
  };
}

/** Maps an in-progress session and the pages already done within it onto `GET /session/active`. */
export function toActiveSessionDTO(
  session: Session,
  completedPageIds: readonly string[],
): ActiveSessionDTO {
  return {
    sessionId: session.id,
    sessionType: session.sessionType,
    startedAt: session.startedAt.toISOString(),
    completedPageIds,
  };
}

export function toSessionSummaryDTO(summary: SessionSummary): SessionSummaryDTO {
  return {
    sessionId: summary.sessionId,
    sessionType: summary.sessionType,
    pagesCompleted: summary.pagesCompleted,
    totalRecallEvents: summary.totalRecallEvents,
    durationSeconds: summary.durationSeconds,
    completedAt: summary.completedAt.toISOString(),
  };
}
