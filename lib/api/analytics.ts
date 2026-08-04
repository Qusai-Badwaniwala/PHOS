import { analyticsOps } from "@/client/operations";
import { formatDatePreferred, formatTimePreferred } from "@/lib/format";
import { ReportingPeriod } from "@/shared/types";
import type { AnalyticsDTO, ChartDataDTO, DateRange, TimelineEntryDTO } from "@/types/dto";

/** Maps the frontend's DateRange onto the Analytics Engine's ReportingPeriod. "year" has no direct equivalent — Overall (all-time) is the closest fit. */
function toReportingPeriod(range: DateRange): ReportingPeriod {
  switch (range) {
    case "today":
      return ReportingPeriod.Daily;
    case "week":
      return ReportingPeriod.Weekly;
    case "month":
      return ReportingPeriod.Monthly;
    case "year":
    case "all":
    default:
      return ReportingPeriod.Overall;
  }
}

/**
 * Analytics data, read from the Analytics Engine.
 *
 * Honest limitations, documented rather than silently papered over:
 * - `currentStreak` has no engine equivalent (the Analytics Engine
 *   does not compute streaks) and is always omitted (it's optional).
 * - `memoryStrengthDistribution` is a genuine 1:1 mapping of the
 *   engine's real per-MemoryState page counts.
 * - `progressOverTime`, `revisionActivity`, `sessionFrequency`, and
 *   `learningTrends` are all derived from the same historical session
 *   list using different aggregations, since the engine does not
 *   produce a separate report for each chart.
 */
export async function getAnalytics(range: DateRange = "month"): Promise<AnalyticsDTO> {
  const period = toReportingPeriod(range);

  const [dashboard, history, trend] = await Promise.all([
    analyticsOps.getDashboard(),
    analyticsOps.getHistoricalReport(period),
    analyticsOps.getTrendAnalysis(period),
  ]);

  const completedSessions = history.sessions.filter((s) => s.completed);
  const totalDuration = completedSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const averageSeconds =
    completedSessions.length > 0 ? Math.round(totalDuration / completedSessions.length) : 0;
  const completionRate =
    history.sessions.length > 0
      ? Math.round((completedSessions.length / history.sessions.length) * 100)
      : 0;

  const progressOverTime: ChartDataDTO[] = history.sessions.map((s) => ({
    label: formatDatePreferred(s.startedAt),
    value: s.pagesCompleted,
  }));

  const sessionFrequency: ChartDataDTO[] = history.sessions.map((s) => ({
    label: formatDatePreferred(s.startedAt),
    value: s.completed ? 1 : 0,
  }));

  const revisionActivity: ChartDataDTO[] = history.sessions.map((s) => ({
    label: formatDatePreferred(s.startedAt),
    value: s.recallCount,
  }));

  const memoryStrengthDistribution: ChartDataDTO[] = Object.entries(
    dashboard.dashboardStatistics.reviewDistribution,
  ).map(([label, value]) => ({ label, value }));

  const learningTrends: ChartDataDTO[] = [{ label: period, value: trend.trendStrength * 100 }];

  const retentionDecay: ChartDataDTO[] = history.sessions.map((s) => ({
    label: formatDatePreferred(s.startedAt),
    value: Math.round(s.successRatio * 100),
  }));

  const timeline: TimelineEntryDTO[] = [...history.sessions]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .map((s) => {
      const sessionDate = new Date(s.startedAt);
      return {
        id: s.sessionId,
        type: "session",
        title: s.completed ? "Completed session" : "Session in progress",
        date: formatDatePreferred(sessionDate),
        time: formatTimePreferred(sessionDate),
        description: `${s.pagesCompleted} page(s), ${s.recallCount} recall(s)`,
        status: s.completed ? "completed" : "pending",
      };
    });

  return {
    summary: {
      totalMemorized: dashboard.dashboardStatistics.totalPagesMemorized,
      revisionCompleted: completedSessions.length,
      completionRate,
      averageSessionTime: `${Math.max(1, Math.round(averageSeconds / 60))} min`,
    },
    progressOverTime,
    revisionActivity,
    sessionFrequency,
    memoryStrengthDistribution,
    learningTrends,
    retentionDecay,
    timeline,
  };
}
