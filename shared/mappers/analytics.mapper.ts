import type {
  DashboardMetrics,
  HistoricalReport,
  ProgressReport,
  SessionStatistics,
  TrendAnalysis,
} from "@/shared/types";
import type {
  DashboardDTO,
  HistoricalReportDTO,
  ProgressReportDTO,
  SessionStatisticsDTO,
  TrendAnalysisDTO,
} from "@/shared/dto";

export function toProgressReportDTO(report: ProgressReport): ProgressReportDTO {
  return {
    period: report.period,
    completedSessions: report.completedSessions,
    completedPages: report.completedPages,
    recallEvents: report.recallEvents,
    progressSummary: report.progressSummary,
  };
}

export function toTrendAnalysisDTO(trend: TrendAnalysis): TrendAnalysisDTO {
  return {
    period: trend.period,
    trendDirection: trend.trendDirection,
    trendStrength: trend.trendStrength,
    summary: trend.summary,
  };
}

export function toSessionStatisticsDTO(stats: SessionStatistics): SessionStatisticsDTO {
  return {
    sessionId: stats.sessionId,
    startedAt: stats.startedAt.toISOString(),
    durationSeconds: stats.durationSeconds,
    pagesCompleted: stats.pagesCompleted,
    recallCount: stats.recallCount,
    successRatio: stats.successRatio,
    completed: stats.completed,
  };
}

export function toDashboardDTO(dashboard: DashboardMetrics): DashboardDTO {
  return {
    memoryHealth: {
      score: dashboard.memoryHealth.score,
      calculatedAt: dashboard.memoryHealth.calculatedAt.toISOString(),
      assessedPages: dashboard.memoryHealth.assessedPages,
    },
    retentionQuality: {
      score: dashboard.retentionQuality.score,
      calculatedAt: dashboard.retentionQuality.calculatedAt.toISOString(),
      assessedRecallEvents: dashboard.retentionQuality.assessedRecallEvents,
    },
    todayProgress: toProgressReportDTO(dashboard.todayProgress),
    weeklyProgress: toProgressReportDTO(dashboard.weeklyProgress),
    monthlyProgress: toProgressReportDTO(dashboard.monthlyProgress),
    dashboardStatistics: {
      totalPagesMemorized: dashboard.dashboardStatistics.totalPagesMemorized,
      reviewDistribution: dashboard.dashboardStatistics.reviewDistribution,
    },
  };
}

export function toHistoricalReportDTO(report: HistoricalReport): HistoricalReportDTO {
  return {
    period: report.period,
    generatedAt: report.generatedAt.toISOString(),
    sessions: report.sessions.map(toSessionStatisticsDTO),
  };
}
