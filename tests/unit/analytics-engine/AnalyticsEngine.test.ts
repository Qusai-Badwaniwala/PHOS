import { describe, expect, it } from "vitest";
import { ConfidenceLevel, MemoryState, ReportingPeriod, SessionType } from "@/shared/types";
import type { Page, RecallEvent, Session, SessionItem } from "@/shared/types";
import type { IPageRepository, IRecallEventRepository, ISessionRepository } from "@/repositories";
import { AnalyticsEngine } from "@/engines/analytics";

function buildPage(overrides: Partial<Page> = {}): Page {
  return {
    id: "page-1",
    pageNumber: 1,
    juzNumber: 1,
    memoryState: MemoryState.Stable,
    memoryStrength: 0.9,
    memoryStability: 20,
    difficulty: 0.2,
    firstStudiedAt: null,
    lastReviewedAt: new Date(),
    lastSuccessfulRecallAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakePageRepository implements Partial<IPageRepository> {
  constructor(private readonly pages: readonly Page[]) {}
  async findAll(): Promise<readonly Page[]> {
    return this.pages;
  }
}

class FakeSessionRepository implements Partial<ISessionRepository> {
  constructor(
    private readonly sessions: readonly Session[],
    private readonly itemsBySession: ReadonlyMap<string, readonly SessionItem[]>,
  ) {}
  async findById(id: string): Promise<Session | null> {
    return this.sessions.find((s) => s.id === id) ?? null;
  }
  async findBetweenDates(): Promise<readonly Session[]> {
    return this.sessions;
  }
  async findSessionItems(sessionId: string): Promise<readonly SessionItem[]> {
    return this.itemsBySession.get(sessionId) ?? [];
  }
}

class FakeRecallEventRepository implements Partial<IRecallEventRepository> {
  constructor(private readonly events: readonly RecallEvent[]) {}
  async findBetweenDates(): Promise<readonly RecallEvent[]> {
    return this.events;
  }
  async findBySession(sessionId: string): Promise<readonly RecallEvent[]> {
    return this.events.filter((e) => e.sessionId === sessionId);
  }
}

describe("AnalyticsEngine", () => {
  const session: Session = {
    id: "session-1",
    sessionType: SessionType.Sabqi,
    startedAt: new Date(),
    completedAt: new Date(),
    durationSeconds: 300,
    createdAt: new Date(),
  };
  const sessionItems: SessionItem[] = [
    { id: "item-1", sessionId: "session-1", pageId: "page-1", order: 0 },
  ];
  const recallEvents: RecallEvent[] = [
    {
      id: "event-1",
      pageId: "page-1",
      sessionId: "session-1",
      timestamp: new Date(),
      successfulRecall: true,
      confidence: ConfidenceLevel.High,
      durationSeconds: 15,
    },
  ];

  function buildEngine() {
    return new AnalyticsEngine({
      pageRepository: new FakePageRepository([buildPage()]) as unknown as IPageRepository,
      sessionRepository: new FakeSessionRepository(
        [session],
        new Map([["session-1", sessionItems]]),
      ) as unknown as ISessionRepository,
      recallEventRepository: new FakeRecallEventRepository(
        recallEvents,
      ) as unknown as IRecallEventRepository,
    });
  }

  it("generates session statistics for an existing session", async () => {
    const stats = await buildEngine().generateSessionStatistics("session-1");
    expect(stats.pagesCompleted).toBe(1);
    expect(stats.recallCount).toBe(1);
    expect(stats.successRatio).toBe(1);
    expect(stats.completed).toBe(true);
  });

  it("generates a progress report", async () => {
    const report = await buildEngine().generateProgressReport(ReportingPeriod.Weekly);
    expect(report.completedSessions).toBe(1);
    expect(report.completedPages).toBe(1);
    expect(report.recallEvents).toBe(1);
  });

  it("generates a full dashboard without throwing", async () => {
    const dashboard = await buildEngine().generateDashboard();
    expect(dashboard.memoryHealth.score).toBeGreaterThanOrEqual(0);
    expect(dashboard.dashboardStatistics.totalPagesMemorized).toBe(1);
  });

  /*
   * Prior memorization the user declared during onboarding is seeded as
   * `Growing`, not `Stable` — PHOS has no evidence about those pages
   * yet. Counting only `Stable`/`Mastered` therefore showed somebody who
   * had just reported 300 memorized pages a dashboard reading
   * "Memorized Pages: 0", directly beside a revision queue built from
   * those very pages.
   */
  it("counts memorization the user declared, not only what has settled", async () => {
    const engine = new AnalyticsEngine({
      pageRepository: new FakePageRepository([
        buildPage({ id: "seeded-1", pageNumber: 1, memoryState: MemoryState.Growing }),
        buildPage({ id: "seeded-2", pageNumber: 2, memoryState: MemoryState.Fragile }),
        buildPage({ id: "seeded-3", pageNumber: 3, memoryState: MemoryState.Encoding }),
        buildPage({ id: "settled", pageNumber: 4, memoryState: MemoryState.Stable }),
        buildPage({ id: "untouched", pageNumber: 5, memoryState: MemoryState.Unseen }),
      ]) as unknown as IPageRepository,
      sessionRepository: new FakeSessionRepository([], new Map()) as unknown as ISessionRepository,
      recallEventRepository: new FakeRecallEventRepository([]) as unknown as IRecallEventRepository,
    });

    const dashboard = await engine.generateDashboard();

    // Four memorized, one never touched. `Unseen` is exactly "not
    // memorized", and is the only thing this number should exclude.
    expect(dashboard.dashboardStatistics.totalPagesMemorized).toBe(4);
  });

  it("summarizes learning progress", async () => {
    const summary = await buildEngine().summarizeLearningProgress();
    expect(summary.summary).toContain("1 of 1 pages");
  });
});
