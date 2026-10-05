import { analyticsOps } from "@/client/operations";
import {
  formatDatePreferred,
  formatTimePreferred,
  describeSessionType,
  formatPageList,
} from "@/lib/format";
import { ReportingPeriod, SessionType } from "@/shared/types";
import type { AnalyticsDTO, ChartDataDTO, DateRange, TimelineEntryDTO } from "@/types/dto";

function toReportingPeriod(range: DateRange): ReportingPeriod {
  return range === "today"
    ? ReportingPeriod.Daily
    : range === "week"
      ? ReportingPeriod.Weekly
      : range === "month"
        ? ReportingPeriod.Monthly
        : range === "year"
          ? ReportingPeriod.Yearly
          : ReportingPeriod.Overall;
}
const localDay = (value: string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export async function getAnalytics(range: DateRange = "month"): Promise<AnalyticsDTO> {
  const period = toReportingPeriod(range);
  const [dashboard, history, trend] = await Promise.all([
    analyticsOps.getDashboard(),
    analyticsOps.getHistoricalReport(period),
    analyticsOps.getTrendAnalysis(period),
  ]);
  const sessions = history.sessions;
  const completed = sessions.filter((session) => session.completed);
  const totalDuration = completed.reduce((sum, session) => sum + session.durationSeconds, 0);
  const averageSeconds = completed.length ? Math.round(totalDuration / completed.length) : 0;
  const daily = new Map<
    string,
    { newPages: number; revisions: number; sessions: number; recalls: number; successes: number }
  >();
  for (const session of sessions) {
    const key = localDay(session.startedAt);
    const day = daily.get(key) ?? {
      newPages: 0,
      revisions: 0,
      sessions: 0,
      recalls: 0,
      successes: 0,
    };
    if (session.sessionType === SessionType.Sabaq) day.newPages += session.pagesCompleted;
    else day.revisions += session.pagesCompleted;
    if (session.completed) day.sessions++;
    day.recalls += session.recallCount;
    day.successes += Math.round(session.successRatio * session.recallCount);
    daily.set(key, day);
  }
  const points = (
    get: (day: {
      newPages: number;
      revisions: number;
      sessions: number;
      recalls: number;
      successes: number;
    }) => number,
    onlyRecall = false,
  ): ChartDataDTO[] =>
    [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([, day]) => !onlyRecall || day.recalls > 0)
      .map(([key, day]) => ({
        date: key,
        label: formatDatePreferred(new Date(`${key}T12:00:00`)),
        value: get(day),
      }));
  const timeline: TimelineEntryDTO[] = [...sessions]
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .map((session) => ({
      id: session.sessionId,
      type: session.sessionType === SessionType.Sabaq ? "session" : "revision",
      title: `${describeSessionType(session.sessionType)}${session.completed ? " recorded" : " in progress"}`,
      date: formatDatePreferred(session.startedAt),
      time: formatTimePreferred(session.startedAt),
      description: `${formatPageList(session.pageNumbers)} · ${session.recallCount} recall${session.recallCount === 1 ? "" : "s"}`,
      status: session.completed ? "completed" : "pending",
    }));
  return {
    summary: {
      totalMemorized: dashboard.dashboardStatistics.totalPagesMemorized,
      revisionCompleted: completed.filter((session) => session.sessionType !== SessionType.Sabaq)
        .length,
      completionRate: sessions.length
        ? Math.round((completed.length / sessions.length) * 100)
        : undefined,
      averageSessionTime: completed.length
        ? `${Math.floor(averageSeconds / 60)}m ${averageSeconds % 60}s`
        : undefined,
    },
    memoryHealth: dashboard.retentionQuality.assessedRecallEvents
      ? dashboard.memoryHealth.score
      : undefined,
    retentionQuality: dashboard.retentionQuality.assessedRecallEvents
      ? dashboard.retentionQuality.score
      : undefined,
    trendSummary:
      period === ReportingPeriod.Overall
        ? "All recorded study. Choose a period to compare it with the preceding period."
        : trend.summary,
    progressOverTime: points((day) => day.newPages),
    revisionActivity: points((day) => day.revisions),
    sessionFrequency: points((day) => day.sessions),
    memoryStrengthDistribution: Object.entries(
      dashboard.dashboardStatistics.reviewDistribution,
    ).map(([label, value]) => ({ label, value })),
    learningTrends:
      period === ReportingPeriod.Overall || trend.canCompare === false
        ? []
        : [{ label: trend.trendDirection, value: Math.round(trend.trendStrength * 100) }],
    // Retained DTO field for compatibility; this is reported recall success, never decay.
    retentionDecay: points((day) => Math.round((day.successes / day.recalls) * 100), true),
    timeline,
  };
}
