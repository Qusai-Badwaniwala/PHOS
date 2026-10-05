import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportingPeriod, SessionType } from "@/shared/types";
import {
  dashboardMetrics,
  historicalReport,
  sessionStatistics,
} from "../../support/adapterFixtures";

/**
 * `lib/api/analytics.ts` derives seven charts from three engine reads.
 * Most of the risk is arithmetic — averages over the wrong subset,
 * percentages divided by the wrong denominator, and division by zero on
 * an empty history — none of which any engine test can see.
 */
const ops = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  getHistoricalReport: vi.fn(),
  getTrendAnalysis: vi.fn(),
}));

vi.mock("@/client/operations", () => ({
  analyticsOps: {
    getDashboard: ops.getDashboard,
    getHistoricalReport: ops.getHistoricalReport,
    getTrendAnalysis: ops.getTrendAnalysis,
  },
}));

const { getAnalytics } = await import("@/lib/api/analytics");

const trend = { period: "Monthly", trendDirection: "Improving", trendStrength: 0.5, summary: "" };

beforeEach(() => {
  vi.clearAllMocks();
  ops.getDashboard.mockResolvedValue(dashboardMetrics());
  ops.getHistoricalReport.mockResolvedValue(historicalReport([]));
  ops.getTrendAnalysis.mockResolvedValue(trend);
});

describe("the date range the user picked", () => {
  it.each([
    ["today", ReportingPeriod.Daily],
    ["week", ReportingPeriod.Weekly],
    ["month", ReportingPeriod.Monthly],
    ["all", ReportingPeriod.Overall],
    ["year", ReportingPeriod.Yearly],
  ] as const)("maps %s onto %s", async (range, expected) => {
    await getAnalytics(range);

    expect(ops.getHistoricalReport).toHaveBeenCalledWith(expected);
    expect(ops.getTrendAnalysis).toHaveBeenCalledWith(expected);
  });
});

describe("the summary figures", () => {
  it("rates completion against every session, finished or not", async () => {
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({ sessionId: "a", completed: true, sessionType: SessionType.Sabqi }),
        sessionStatistics({ sessionId: "b", completed: true }),
        sessionStatistics({ sessionId: "c", completed: false }),
        sessionStatistics({ sessionId: "d", completed: false }),
      ]),
    );

    const data = await getAnalytics("month");

    expect(data.summary.completionRate).toBe(50);
    expect(data.summary.revisionCompleted).toBe(1);
  });

  it("averages duration over completed sessions only", async () => {
    // An abandoned session's duration says nothing about how long a
    // session takes, so including it would drag the average toward zero
    // and quietly misreport the user's pace.
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({ sessionId: "a", completed: true, durationSeconds: 600 }),
        sessionStatistics({ sessionId: "b", completed: true, durationSeconds: 600 }),
        sessionStatistics({ sessionId: "c", completed: false, durationSeconds: 0 }),
      ]),
    );

    const data = await getAnalytics("month");

    expect(data.summary.averageSessionTime).toBe("10m 0s");
  });

  it("survives an empty history without dividing by zero", async () => {
    const data = await getAnalytics("month");

    expect(data.summary.completionRate).toBeUndefined();
    expect(data.summary.revisionCompleted).toBe(0);
    // Unknown is different from a measured zero or an invented minute.
    expect(data.summary.averageSessionTime).toBeUndefined();
    expect(data.timeline).toEqual([]);
  });

  it("reports memorized pages straight from the engine", async () => {
    ops.getDashboard.mockResolvedValue(
      dashboardMetrics({
        dashboardStatistics: { totalPagesMemorized: 37, reviewDistribution: {} },
      }),
    );

    expect((await getAnalytics("month")).summary.totalMemorized).toBe(37);
  });
});

describe("the charts", () => {
  it("maps the memory-state distribution one-for-one", async () => {
    ops.getDashboard.mockResolvedValue(
      dashboardMetrics({
        dashboardStatistics: {
          totalPagesMemorized: 5,
          reviewDistribution: { Growing: 3, Stable: 2 },
        },
      }),
    );

    const data = await getAnalytics("month");

    expect(data.memoryStrengthDistribution).toEqual([
      { label: "Growing", value: 3 },
      { label: "Stable", value: 2 },
    ]);
  });

  it("plots retention as a whole-number percentage of successful recalls", async () => {
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([sessionStatistics({ successRatio: 2 / 3, recallCount: 3 })]),
    );

    expect((await getAnalytics("month")).retentionDecay[0]?.value).toBe(67);
  });
});

describe("the timeline", () => {
  it("lists the most recent session first", async () => {
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({ sessionId: "older", startedAt: new Date(2026, 7, 1).toISOString() }),
        sessionStatistics({ sessionId: "newest", startedAt: new Date(2026, 7, 3).toISOString() }),
        sessionStatistics({ sessionId: "middle", startedAt: new Date(2026, 7, 2).toISOString() }),
      ]),
    );

    const data = await getAnalytics("month");

    expect(data.timeline.map((entry) => entry.id)).toEqual(["newest", "middle", "older"]);
  });

  it("distinguishes a finished session from one still open", async () => {
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({
          sessionId: "a",
          completed: true,
          pagesCompleted: 3,
          pageNumbers: [12, 13, 14],
          recallCount: 3,
        }),
        sessionStatistics({
          sessionId: "b",
          completed: false,
          startedAt: new Date(2026, 6, 1).toISOString(),
        }),
      ]),
    );

    const data = await getAnalytics("month");

    expect(data.timeline[0]).toMatchObject({
      title: "Memorization recorded",
      status: "completed",
      description: "Pages 12–14 · 3 recalls",
    });
    expect(data.timeline[1]).toMatchObject({
      title: "Memorization in progress",
      status: "pending",
    });
  });
});
