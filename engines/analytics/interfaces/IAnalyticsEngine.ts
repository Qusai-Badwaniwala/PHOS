import type {
  DashboardMetrics,
  HistoricalReport,
  LearningProgressSummary,
  MemoryHealth,
  ProgressReport,
  ReportingPeriod,
  RetentionQuality,
  SessionStatistics,
  TrendAnalysis,
} from "@/shared/types";

/**
 * Public contract of the Analytics Engine (SDS Part 14 "PUBLIC
 * INTERFACE"). Every method is read-only: this engine never writes
 * data, and every result is computed on demand — nothing here is ever
 * persisted (SDS Part 8: "Store Facts. Compute Insights.").
 */
export interface IAnalyticsEngine {
  calculateMemoryHealth(): Promise<MemoryHealth>;
  calculateRetentionQuality(): Promise<RetentionQuality>;
  generateDashboard(): Promise<DashboardMetrics>;
  generateProgressReport(period: ReportingPeriod): Promise<ProgressReport>;
  generateTrendAnalysis(period: ReportingPeriod): Promise<TrendAnalysis>;
  generateSessionStatistics(sessionId: string): Promise<SessionStatistics>;
  generateHistoricalReport(period: ReportingPeriod): Promise<HistoricalReport>;
  summarizeLearningProgress(): Promise<LearningProgressSummary>;
}
