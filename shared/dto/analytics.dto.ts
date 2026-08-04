export interface MemoryHealthDTO {
  readonly score: number;
  readonly calculatedAt: string;
  /** Pages the score was computed from. 0 means the score is not yet meaningful. */
  readonly assessedPages: number;
}

export interface RetentionQualityDTO {
  readonly score: number;
  readonly calculatedAt: string;
  /** Recall events the score was computed from. 0 means the score is not yet meaningful. */
  readonly assessedRecallEvents: number;
}

export interface ProgressReportDTO {
  readonly period: string;
  readonly completedSessions: number;
  readonly completedPages: number;
  readonly recallEvents: number;
  readonly progressSummary: string;
}

export interface TrendAnalysisDTO {
  readonly period: string;
  readonly trendDirection: string;
  readonly trendStrength: number;
  readonly summary: string;
}

export interface DashboardStatisticsDTO {
  readonly totalPagesMemorized: number;
  readonly reviewDistribution: Readonly<Record<string, number>>;
}

/** "These values originate exclusively from the Analytics Engine" (SDS Part 16). */
export interface DashboardDTO {
  readonly memoryHealth: MemoryHealthDTO;
  readonly retentionQuality: RetentionQualityDTO;
  readonly todayProgress: ProgressReportDTO;
  readonly weeklyProgress: ProgressReportDTO;
  readonly monthlyProgress: ProgressReportDTO;
  readonly dashboardStatistics: DashboardStatisticsDTO;
}

export interface SessionStatisticsDTO {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly durationSeconds: number;
  readonly pagesCompleted: number;
  readonly recallCount: number;
  readonly successRatio: number;
  readonly completed: boolean;
}

export interface HistoricalReportDTO {
  readonly period: string;
  readonly generatedAt: string;
  readonly sessions: readonly SessionStatisticsDTO[];
}
