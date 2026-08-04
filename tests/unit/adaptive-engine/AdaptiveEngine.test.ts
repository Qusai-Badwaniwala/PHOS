import { describe, expect, it } from "vitest";
import { MemoryState } from "@/shared/types";
import type { MemoryProfile, Page, Session, SessionItem } from "@/shared/types";
import type { IMemoryEngine } from "@/engines/memory";
import type {
  CreateSessionInput,
  CreateSessionItemInput,
  IPageRepository,
  ISessionRepository,
} from "@/repositories";
import { AdaptiveEngine } from "@/engines/adaptive";
import { InvalidStudyDurationError } from "@/engines/adaptive/errors";

function buildPage(overrides: Partial<Page> = {}): Page {
  return {
    id: `page-${overrides.pageNumber ?? 1}`,
    pageNumber: 1,
    juzNumber: 1,
    memoryState: MemoryState.Unseen,
    memoryStrength: 0,
    memoryStability: 0,
    difficulty: 0.3,
    firstStudiedAt: null,
    lastReviewedAt: null,
    lastSuccessfulRecallAt: null,
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
  async create(_input: CreateSessionInput): Promise<Session> {
    throw new Error("not used in these tests");
  }
  async findBetweenDates(): Promise<readonly Session[]> {
    return [];
  }
  /** No completed session: these tests are about ranking, not about returning after a break. */
  async findLastCompleted(): Promise<Session | null> {
    return null;
  }
  async findSessionItems(): Promise<readonly SessionItem[]> {
    return [];
  }
  async addSessionItem(_item: CreateSessionItemInput): Promise<SessionItem> {
    throw new Error("not used in these tests");
  }
}

class FakeMemoryEngine implements Partial<IMemoryEngine> {
  async getCurrentMemoryProfile(pageId: string): Promise<MemoryProfile> {
    return {
      pageId,
      memoryState: MemoryState.Unseen,
      memoryStrength: 0,
      memoryStability: 0,
      difficulty: 0.3,
    };
  }
}

describe("AdaptiveEngine.generateDailyPlan", () => {
  it("rejects a non-positive study duration", async () => {
    const engine = new AdaptiveEngine({
      pageRepository: new FakePageRepository([]) as unknown as IPageRepository,
      sessionRepository: new FakeSessionRepository() as unknown as ISessionRepository,
      memoryEngine: new FakeMemoryEngine() as unknown as IMemoryEngine,
    });

    await expect(engine.generateDailyPlan(0)).rejects.toThrow(InvalidStudyDurationError);
  });

  it("produces a fully ordered plan that never exceeds available time", async () => {
    const pages = Array.from({ length: 20 }, (_, i) =>
      buildPage({ pageNumber: i + 1, id: `page-${i + 1}` }),
    );
    const engine = new AdaptiveEngine({
      pageRepository: new FakePageRepository(pages) as unknown as IPageRepository,
      sessionRepository: new FakeSessionRepository() as unknown as ISessionRepository,
      memoryEngine: new FakeMemoryEngine() as unknown as IMemoryEngine,
    });

    const plan = await engine.generateDailyPlan(10);

    expect(plan.estimatedTotalDurationSeconds).toBeLessThanOrEqual(10 * 60);
    plan.studyItems.forEach((item, index) => {
      expect(item.recommendedOrder).toBe(index);
    });
  });

  it("produces an identical plan for identical inputs (PLAN GENERATION CONTRACT)", async () => {
    const pages = [buildPage({ pageNumber: 1, id: "page-1" })];
    const buildEngine = () =>
      new AdaptiveEngine({
        pageRepository: new FakePageRepository(pages) as unknown as IPageRepository,
        sessionRepository: new FakeSessionRepository() as unknown as ISessionRepository,
        memoryEngine: new FakeMemoryEngine() as unknown as IMemoryEngine,
      });

    const planA = await buildEngine().generateDailyPlan(30);
    const planB = await buildEngine().generateDailyPlan(30);

    expect(planA.studyItems.map((i) => i.pageId)).toEqual(planB.studyItems.map((i) => i.pageId));
  });
});
