import { WorkloadCategory } from "@/shared/types";
import type {
  DailyStudyPlanDTO,
  DashboardDTO,
  HistoricalReportDTO,
  SessionStatisticsDTO,
  SettingsDTO,
  StudyItemDTO,
} from "@/shared/dto";

/**
 * Builders for the engine DTOs that `lib/api/*` adapts.
 *
 * Each takes a partial override, so a test states only the field it is
 * actually about and the rest stays plausible. A test that had to spell
 * out a whole `DailyStudyPlanDTO` to assert one number would bury its
 * own point.
 */

export function studyItem(overrides: Partial<StudyItemDTO> = {}): StudyItemDTO {
  return {
    pageId: `page-${overrides.pageNumber ?? 1}`,
    pageNumber: 1,
    memoryState: "Growing",
    workloadCategory: WorkloadCategory.NewMemorization,
    juzNumber: 1,
    recommendedOrder: 1,
    estimatedDuration: 60,
    ...overrides,
  };
}

export function dailyPlan(
  studyItems: StudyItemDTO[],
  overrides: Partial<DailyStudyPlanDTO> = {},
): DailyStudyPlanDTO {
  return {
    studyItems,
    estimatedTotalDurationSeconds: studyItems.reduce((sum, i) => sum + i.estimatedDuration, 0),
    recoveryRecommended: false,
    explanation: { headline: "A steady day.", details: ["Two pages of revision."] },
    returnAssessment: {
      status: "Regular",
      daysSinceLastSession: 1,
      newMemorizationAllowance: 1,
      welcomeBackMessage: null,
    },
    workload: {
      recommendedNewPages: 1,
      basis: "Onboarding",
      successRate: null,
      observedDailyPace: null,
      consistency: null,
      direction: "Steady",
      rationale: "Not enough history yet.",
    },
    workloadWarning: null,
    ...overrides,
  };
}

export function dashboardMetrics(overrides: Partial<DashboardDTO> = {}): DashboardDTO {
  const progress = {
    period: "Daily",
    completedSessions: 0,
    completedPages: 0,
    recallEvents: 0,
    progressSummary: "",
  };
  return {
    memoryHealth: { score: 45, calculatedAt: new Date().toISOString(), assessedPages: 0 },
    retentionQuality: {
      score: 80,
      calculatedAt: new Date().toISOString(),
      assessedRecallEvents: 0,
    },
    todayProgress: progress,
    weeklyProgress: progress,
    monthlyProgress: progress,
    dashboardStatistics: { totalPagesMemorized: 0, reviewDistribution: {} },
    ...overrides,
  };
}

export function sessionStatistics(
  overrides: Partial<SessionStatisticsDTO> = {},
): SessionStatisticsDTO {
  return {
    sessionId: "session-1",
    startedAt: new Date(2026, 7, 1, 10, 0).toISOString(),
    durationSeconds: 600,
    pagesCompleted: 2,
    recallCount: 2,
    successRatio: 1,
    completed: true,
    ...overrides,
  };
}

export function historicalReport(sessions: SessionStatisticsDTO[]): HistoricalReportDTO {
  return { period: "Weekly", generatedAt: new Date().toISOString(), sessions };
}

export function engineSettings(overrides: Partial<SettingsDTO> = {}): SettingsDTO {
  return {
    theme: "system",
    ayahRotationFrequency: 1,
    personalization: { theme: "system", ayahRotationFrequency: 1 },
    preferences: {
      dateFormat: "mdy",
      timeFormat: "12h",
      reducedMotion: false,
      compactMode: false,
      sessionShowTimer: true,
      sessionShowProgress: true,
      sessionConfirmCompletion: false,
      revisionShowProgress: true,
    },
    onboarding: {
      completed: true,
      completedAt: new Date(2026, 7, 1).toISOString(),
      memorizationLevel: "Beginner",
      pagesAlreadyMemorized: 0,
      dailyAvailableMinutes: 45,
      comfortableDailyPages: 1,
      followsExistingSchedule: false,
      revisionStartsImmediately: true,
    },
    memorizationOrder: "Standard",
    goal: null,
    revision: { mode: "Adaptive", cycleLengthDays: 7, cycleStartedAt: null },
    ...overrides,
  };
}
