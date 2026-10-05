import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportingPeriod, WorkloadCategory, SessionType } from "@/shared/types";
import {
  dailyPlan,
  dashboardMetrics,
  engineSettings,
  historicalReport,
  sessionStatistics,
  studyItem,
} from "../../support/adapterFixtures";

/**
 * `lib/api/dashboard.ts` is the largest piece of mapping logic in the
 * application and, until now, the only one with no tests at all.
 *
 * It is also where the worst defect in PHOS's history lived:
 * `workloadCategory` was absent from the DTO while three adapters
 * filtered on it, so every scheduled page fell into Revision and the
 * Session card was permanently empty. Every engine test passed and
 * TypeScript said nothing. The first test below is the one that would
 * have caught it.
 */
const ops = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  getHistoricalReport: vi.fn(),
  getTrendAnalysis: vi.fn(),
  getGoalProjection: vi.fn(),
  getTodayPlan: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock("@/client/operations", () => ({
  analyticsOps: {
    getDashboard: ops.getDashboard,
    getHistoricalReport: ops.getHistoricalReport,
    getTrendAnalysis: ops.getTrendAnalysis,
    getGoalProjection: ops.getGoalProjection,
  },
  sessionOps: { getTodayPlan: ops.getTodayPlan },
  settingsOps: { getSettings: ops.getSettings },
  backupOps: { DATA_RESET_CONFIRMATION: "DELETE" },
}));

const STEADY_TREND = {
  period: "Weekly",
  trendDirection: "Steady",
  trendStrength: 0,
  summary: "Your recall has held steady since last week.",
};

const { getDashboardData } = await import("@/lib/api/dashboard");

beforeEach(() => {
  vi.clearAllMocks();
  ops.getSettings.mockResolvedValue(engineSettings());
  ops.getDashboard.mockResolvedValue(dashboardMetrics());
  ops.getHistoricalReport.mockResolvedValue(historicalReport([]));
  ops.getTrendAnalysis.mockResolvedValue(STEADY_TREND);
  ops.getGoalProjection.mockResolvedValue(null);
  ops.getTodayPlan.mockResolvedValue(dailyPlan([]));
});

describe("the Session card", () => {
  it("counts only new-memorization work, never revision", async () => {
    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([
        studyItem({ pageNumber: 10, workloadCategory: WorkloadCategory.OverdueRevision }),
        studyItem({ pageNumber: 20, workloadCategory: WorkloadCategory.NewMemorization }),
        studyItem({ pageNumber: 21, workloadCategory: WorkloadCategory.NewMemorization }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.session?.progress.total).toBe(2);
    expect(data.session?.assignment?.startPage).toBe(20);
    expect(data.session?.assignment?.endPage).toBe(21);
  });

  it("is null when nothing new is scheduled today", async () => {
    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([studyItem({ workloadCategory: WorkloadCategory.RecentRevision })]),
    );

    expect((await getDashboardData()).session).toBeNull();
  });

  it("sums estimated time across the assignment, rounded to whole minutes", async () => {
    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([
        studyItem({ pageNumber: 1, estimatedDuration: 90 }),
        studyItem({ pageNumber: 2, estimatedDuration: 90 }),
      ]),
    );

    expect((await getDashboardData()).session?.estimatedTime).toBe("3 min");
  });
});

describe("the Revision card is scoped to one session type", () => {
  /*
   * A session is started with exactly one `SessionType`, and the
   * Learning Engine scopes its plan to that type's categories. The
   * Dashboard must scope its preview the same way, or it advertises an
   * assignment the session would refuse to accept.
   */
  it("takes only Recovery work when recovery is the highest priority", async () => {
    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([
        studyItem({ pageNumber: 1, workloadCategory: WorkloadCategory.Recovery }),
        studyItem({ pageNumber: 2, workloadCategory: WorkloadCategory.OverdueRevision }),
        studyItem({ pageNumber: 3, workloadCategory: WorkloadCategory.LongTermRevision }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.revision?.assignment?.type).toBe("recovery");
    expect(data.revision?.assignment?.pages).toEqual(["Page 1"]);
  });

  it("groups overdue and recent revision into one Sabqi assignment", async () => {
    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([
        studyItem({ pageNumber: 1, workloadCategory: WorkloadCategory.OverdueRevision }),
        studyItem({ pageNumber: 2, workloadCategory: WorkloadCategory.RecentRevision }),
        studyItem({ pageNumber: 3, workloadCategory: WorkloadCategory.LongTermRevision }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.revision?.assignment?.type).toBe("sabqi");
    // Long-term work belongs to Manzil and must not be swept in.
    expect(data.revision?.assignment?.totalPages).toBe(2);
  });

  it("refuses to name a surah range for pages that are not consecutive", async () => {
    /*
     * Revision is scheduled by memory priority, so an assignment is
     * routinely scattered and arrives in priority order. Labelling
     * 345/346/400 as "Al-Anbiya – Al-Furqan" would name a fifty-page
     * span the user was never asked to revise — and taking the range
     * ends from the unsorted list could even print it backwards.
     */
    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([
        studyItem({
          pageNumber: 400,
          juzNumber: 20,
          workloadCategory: WorkloadCategory.RecentRevision,
        }),
        studyItem({
          pageNumber: 345,
          juzNumber: 17,
          workloadCategory: WorkloadCategory.RecentRevision,
        }),
        studyItem({
          pageNumber: 346,
          juzNumber: 17,
          workloadCategory: WorkloadCategory.RecentRevision,
        }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.revision?.assignment?.surah).toBeUndefined();
    expect(data.revision?.assignment?.juzNumber).toBeUndefined();
    // The honest summary: which Juz the work actually touches.
    expect(data.revision?.assignment?.juzCovered).toEqual([17, 20]);
    // Listed in page order, as someone holding a Mushaf would work.
    expect(data.revision?.assignment?.pages).toEqual(["Page 345", "Page 346", "Page 400"]);
  });

  it("names the surah range when the pages really are consecutive", async () => {
    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([
        studyItem({
          pageNumber: 3,
          juzNumber: 1,
          workloadCategory: WorkloadCategory.RecentRevision,
        }),
        studyItem({
          pageNumber: 2,
          juzNumber: 1,
          workloadCategory: WorkloadCategory.RecentRevision,
        }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.revision?.assignment?.surah).toBeTruthy();
    expect(data.revision?.assignment?.juzNumber).toBe(1);
  });

  it("reports every scheduled revision page in the queue stat, not just this assignment", async () => {
    // `revisionQueue` is labelled "Pages scheduled for today", so it
    // deliberately counts across all categories while the card above
    // shows one assignment. Narrowing this to match the card would make
    // the number quietly wrong.
    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([
        studyItem({ pageNumber: 1, workloadCategory: WorkloadCategory.Recovery }),
        studyItem({ pageNumber: 2, workloadCategory: WorkloadCategory.OverdueRevision }),
        studyItem({ pageNumber: 3, workloadCategory: WorkloadCategory.LongTermRevision }),
        studyItem({ pageNumber: 4, workloadCategory: WorkloadCategory.NewMemorization }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.revision?.assignment?.totalPages).toBe(1);
    expect(data.stats.revisionQueue).toBe(3);
  });
});

describe("Memory Health and Retention Quality are withheld without evidence", () => {
  /*
   * Found by the product owner running the app: the dashboard showed
   * "Memory Health 45%" after onboarding and before a single recall.
   * That number was computed entirely from values PHOS had *assumed*
   * from the user's own estimate, presented as a measurement on the
   * screen they trust most.
   */
  it("omits both scores when no recall has ever been recorded", async () => {
    ops.getDashboard.mockResolvedValue(
      dashboardMetrics({
        memoryHealth: { score: 45, calculatedAt: new Date().toISOString(), assessedPages: 604 },
        retentionQuality: {
          score: 80,
          calculatedAt: new Date().toISOString(),
          assessedRecallEvents: 0,
        },
      }),
    );

    const data = await getDashboardData();

    expect(data.memoryHealth).toBeUndefined();
    expect(data.retentionQuality).toBeUndefined();
  });

  it("reports both once a single recall exists", async () => {
    ops.getDashboard.mockResolvedValue(
      dashboardMetrics({
        memoryHealth: { score: 62, calculatedAt: new Date().toISOString(), assessedPages: 604 },
        retentionQuality: {
          score: 71,
          calculatedAt: new Date().toISOString(),
          assessedRecallEvents: 1,
        },
      }),
    );

    const data = await getDashboardData();

    expect(data.memoryHealth).toBe(62);
    expect(data.retentionQuality).toBe(71);
  });
});

describe("the weekly strip", () => {
  it("marks the day a session was started, not the day the report was fetched", async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([sessionStatistics({ startedAt: twoDaysAgo.toISOString() })]),
    );

    const data = await getDashboardData();

    expect(data.weeklyProgress).toHaveLength(7);
    // The strip runs oldest-first and ends on today, so two days ago is
    // the fifth of seven.
    expect(data.weeklyProgress[4]?.completed).toBe(true);
    expect(data.weeklyProgress[6]?.completed).toBe(false);
  });

  it("ignores sessions that were started but never completed", async () => {
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({ startedAt: new Date().toISOString(), completed: false }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.weeklyProgress[6]?.completed).toBe(false);
    expect(data.stats.weeklyProgress).toBe(0);
  });
});

describe("the plan's own explanation", () => {
  it("passes the engine's wording through without rewording it", async () => {
    // Requirement 4: explanations must match actual adaptive-engine
    // decisions. Any rephrasing here would be a second, unverified
    // account of why the plan looks as it does.
    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([], {
        explanation: {
          headline: "Lighter today, because your recall slipped.",
          details: ["Two pages held back.", "Revision comes first."],
        },
      }),
    );

    const data = await getDashboardData();

    expect(data.planExplanation.headline).toBe("Lighter today, because your recall slipped.");
    expect(data.planExplanation.details).toEqual(["Two pages held back.", "Revision comes first."]);
  });

  it("surfaces a workload warning when the engine raised one, and null otherwise", async () => {
    expect((await getDashboardData()).workloadWarning).toBeNull();

    ops.getTodayPlan.mockResolvedValue(
      dailyPlan([], {
        workloadWarning: {
          estimatedMinutes: 95,
          availableMinutes: 45,
          deferrablePages: 4,
          message: "Today is heavier than usual.",
        },
      }),
    );

    expect((await getDashboardData()).workloadWarning).toBe("Today is heavier than usual.");
  });
});

describe("the goal card", () => {
  /** A projection as the Analytics Engine would report it. */
  function projection(overrides: Record<string, unknown> = {}) {
    return {
      targetPages: 604,
      targetDate: new Date(2029, 2, 1).toISOString(),
      pagesMemorized: 120,
      pagesRemaining: 484,
      observedPagesPerDay: 1,
      assessedDays: 30,
      projectedCompletionDate: new Date(2028, 0, 15).toISOString(),
      daysFromGoal: -410,
      targetReached: false,
      ...overrides,
    };
  }

  it("is absent when the user has set no goal", async () => {
    // Most people never set one. An empty card is not a feature.
    expect((await getDashboardData()).goal).toBeNull();
  });

  it("never states a pace PHOS has not measured", async () => {
    /*
     * The evidence gate, carried all the way to the sentence. Below the
     * threshold the engine reports a null pace, and the card must say
     * so rather than rendering "0 pages a day" — which would read as
     * "you have stopped" to someone three days in.
     */
    ops.getGoalProjection.mockResolvedValue(
      projection({
        observedPagesPerDay: null,
        projectedCompletionDate: null,
        daysFromGoal: null,
        assessedDays: 3,
        pagesMemorized: 6,
      }),
    );

    const goal = (await getDashboardData()).goal!;

    expect(goal.pacePerDay).toBeNull();
    expect(goal.projectedDate).toBeNull();
    expect(goal.summary).toContain("6 of 604");
    expect(goal.summary).not.toMatch(/0 pages a day/);
    expect(goal.note).toMatch(/about a week/);
  });

  it("says how far ahead a fast pace lands, without praise", async () => {
    ops.getGoalProjection.mockResolvedValue(projection());

    const goal = (await getDashboardData()).goal!;

    expect(goal.summary).toMatch(/before your goal/);
    // No congratulation, no exclamation — it is arithmetic either way.
    expect(goal.summary).not.toMatch(/!/);
    expect(goal.note).toBeUndefined();
  });

  it("says how far late a slow pace lands, and refuses to make it a verdict", async () => {
    ops.getGoalProjection.mockResolvedValue(
      projection({
        projectedCompletionDate: new Date(2029, 8, 1).toISOString(),
        daysFromGoal: 184,
      }),
    );

    const goal = (await getDashboardData()).goal!;

    expect(goal.summary).toMatch(/after your goal/);
    expect(goal.summary).not.toMatch(/behind|failing|!/i);
    /*
     * The note exists so a goal card cannot quietly reverse PHOS's
     * central rule. Everywhere else the application protects retention
     * over speed; being late must not read as an instruction to rush.
     */
    expect(goal.note).toMatch(/not automatically the right answer/);
  });

  it("calls it close rather than picking a side, within a fortnight either way", async () => {
    // An averaged pace cannot honestly resolve a difference of days.
    ops.getGoalProjection.mockResolvedValue(projection({ daysFromGoal: 5 }));

    const goal = (await getDashboardData()).goal!;

    expect(goal.summary).toMatch(/close to your goal/);
    expect(goal.summary).not.toMatch(/before your goal|after your goal/);
  });

  it("says so plainly once the target is reached", async () => {
    ops.getGoalProjection.mockResolvedValue(
      projection({ targetReached: true, pagesRemaining: 0, projectedCompletionDate: null }),
    );

    const goal = (await getDashboardData()).goal!;

    expect(goal.summary).toMatch(/reached your goal/);
    expect(goal.projectedDate).toBeNull();
  });
});

describe("the weekly review", () => {
  it("reports new pages separately from repeated revision pages", async () => {
    ops.getDashboard.mockResolvedValue(
      dashboardMetrics({
        weeklyProgress: {
          period: "Weekly",
          completedSessions: 5,
          completedPages: 12,
          recallEvents: 63,
          progressSummary: "",
        },
      }),
    );

    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({ sessionType: SessionType.Sabaq, pagesCompleted: 2 }),
        sessionStatistics({ sessionType: SessionType.Sabqi, pagesCompleted: 10 }),
      ]),
    );
    const review = (await getDashboardData()).weeklyReview;

    expect(review).toMatchObject({
      pagesCompleted: 2,
      sessionsCompleted: 5,
      recallsRecorded: 63,
      recallTrend: "Steady",
    });
  });

  it("passes the engine's trend sentence through verbatim", async () => {
    // Requirement 4's principle: a second, reworded account of the
    // user's progress is worse than none.
    ops.getTrendAnalysis.mockResolvedValue({
      ...STEADY_TREND,
      summary: "Your recall improved noticeably this week.",
    });

    expect((await getDashboardData()).weeklyReview.trendSummary).toBe(
      "Your recall improved noticeably this week.",
    );
  });
});

describe("the study budget", () => {
  it("plans within the minutes the user chose during onboarding", async () => {
    ops.getSettings.mockResolvedValue(
      engineSettings({
        onboarding: { ...engineSettings().onboarding, dailyAvailableMinutes: 20 },
      }),
    );

    await getDashboardData();

    expect(ops.getTodayPlan).toHaveBeenCalledWith(20);
    expect(ops.getHistoricalReport).toHaveBeenCalledWith(ReportingPeriod.Weekly);
  });
});

/**
 * Recent activity.
 *
 * Raised by the product owner: every entry read "Completed session",
 * whether it was revision or new memorization, and never said which
 * pages. A record of a Hifz day that cannot say what was studied is
 * not much of a record.
 */
describe("recent activity", () => {
  it("names the pages that were actually studied", async () => {
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({ sessionId: "s1", completed: true, pageNumbers: [12, 13, 14] }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.recentActivity[0]!.detail).toBe("Pages 12–14");
  });

  it("distinguishes revision from new memorization", async () => {
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({ sessionId: "s1", sessionType: "Manzil", completed: true }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.recentActivity[0]!.title).toBe("Completed revision");
  });

  it("says memorization for a Sabaq", async () => {
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({ sessionId: "s1", sessionType: "Sabaq", completed: true }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.recentActivity[0]!.title).toBe("Completed memorization");
  });

  it("names an unfinished session as in progress, without claiming it is done", async () => {
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([
        sessionStatistics({ sessionId: "s1", sessionType: "Sabaq", completed: false }),
      ]),
    );

    const data = await getDashboardData();

    expect(data.recentActivity[0]!.title).toBe("Memorization in progress");
    expect(data.recentActivity[0]!.status).toBe("pending");
  });

  it("omits the detail line rather than printing an empty one", async () => {
    // A session whose items could not be resolved still has a title and
    // a date; it just has nothing to say about pages.
    ops.getHistoricalReport.mockResolvedValue(
      historicalReport([sessionStatistics({ sessionId: "s1", pageNumbers: [] })]),
    );

    const data = await getDashboardData();

    expect(data.recentActivity[0]!.detail).toBeUndefined();
  });
});
