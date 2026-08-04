import { describe, expect, it } from "vitest";
import { MemoryState, WorkloadCategory } from "@/shared/types";
import type {
  CreateSessionInput,
  CreateSessionItemInput,
  IPageRepository,
  ISessionRepository,
  ISettingsRepository,
} from "@/repositories";
import type { IMemoryEngine } from "@/engines/memory";
import type { Page, Session, SessionItem } from "@/shared/types";
import { AdaptiveEngine } from "@/engines/adaptive";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";

/**
 * PRODUCT_REQUIREMENTS Requirement 5, verified end-to-end through
 * `generateDailyPlan()` rather than against the calculator alone.
 *
 * This exists because of a defect found by running the application: the
 * returning-user allowance was originally applied to every *eligible*
 * page. With ~600 pages unstudied and a 45-minute day, scaling 600 by
 * 0.6 still left far more new memorization than could fit, so the time
 * budget bound first and the plan came out completely unchanged — the
 * reduction existed only on paper. The allowance must be measured
 * against the plan the user would otherwise have received.
 */
const MINUTES = 30;
const MILLISECONDS_PER_DAY = 86_400_000;

function unseenPage(pageNumber: number): Page {
  return {
    id: `page-${pageNumber}`,
    pageNumber,
    juzNumber: Math.ceil(pageNumber / 20),
    memoryState: MemoryState.Unseen,
    memoryStrength: 0,
    memoryStability: 0,
    difficulty: 0.5,
    firstStudiedAt: null,
    lastReviewedAt: null,
    lastSuccessfulRecallAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** A page well past its revision point, so it always qualifies for review. */
function duePage(pageNumber: number): Page {
  const longAgo = new Date(Date.now() - 30 * MILLISECONDS_PER_DAY);
  return {
    ...unseenPage(pageNumber),
    memoryState: MemoryState.Growing,
    memoryStrength: 0.8,
    memoryStability: 3,
    firstStudiedAt: null,
    lastReviewedAt: longAgo,
    lastSuccessfulRecallAt: longAgo,
  };
}

function buildEngine(lastCompletedDaysAgo: number | null) {
  // Far more unstudied pages than could ever fit in the day — the
  // condition that made the original implementation a no-op.
  const pages: Page[] = [
    ...Array.from({ length: 5 }, (_, i) => duePage(i + 1)),
    ...Array.from({ length: 500 }, (_, i) => unseenPage(i + 100)),
  ];

  const pageRepository = {
    findAll: async () => pages,
  } as unknown as IPageRepository;

  const sessionRepository = {
    async create(_input: CreateSessionInput): Promise<Session> {
      throw new Error("not used");
    },
    async findBetweenDates(): Promise<readonly Session[]> {
      return [];
    },
    async findSessionItems(): Promise<readonly SessionItem[]> {
      return [];
    },
    async addSessionItem(_item: CreateSessionItemInput): Promise<SessionItem> {
      throw new Error("not used");
    },
    async findLastCompleted(): Promise<Session | null> {
      if (lastCompletedDaysAgo === null) return null;
      return {
        id: "session-1",
        sessionType: "Sabaq",
        startedAt: new Date(),
        completedAt: new Date(Date.now() - lastCompletedDaysAgo * MILLISECONDS_PER_DAY),
        durationSeconds: 600,
        createdAt: new Date(),
      } as Session;
    },
  } as unknown as ISessionRepository;

  // A deliberately generous comfortable pace. Phase 6 added a second,
  // independent cap on new memorization derived from observed
  // performance (Requirements 3/7/8); with the default pace of one page
  // it binds tighter than the returning-user allowance and would mask
  // the behaviour these tests exist to check. There is no recall
  // history here, so the workload recommendation stays at this stated
  // pace and the return policy is the only constraint in play.
  const settingsRepository = {
    getSettings: async () => ({ comfortableDailyPages: 20 }),
  } as unknown as ISettingsRepository;

  return new AdaptiveEngine({
    pageRepository,
    sessionRepository,
    settingsRepository,
    memoryEngine: {} as unknown as IMemoryEngine,
    config: DEFAULT_ADAPTIVE_CONFIG,
  });
}

async function planCounts(daysAgo: number | null) {
  const plan = await buildEngine(daysAgo).generateDailyPlan(MINUTES);
  const newCount = plan.studyItems.filter(
    (item) => item.workloadCategory === WorkloadCategory.NewMemorization,
  ).length;
  return { newCount, revisionCount: plan.studyItems.length - newCount, plan };
}

describe("returning-user policy applied to a real plan", () => {
  it("reduces scheduled new memorization even when time is the binding constraint", async () => {
    const current = await planCounts(0);
    const shortBreak = await planCounts(4);

    expect(current.newCount).toBeGreaterThan(0);
    expect(shortBreak.newCount).toBeLessThan(current.newCount);
  });

  it("reduces new memorization further the longer the absence", async () => {
    const shortBreak = await planCounts(4);
    const extended = await planCounts(10);
    const long = await planCounts(45);

    expect(extended.newCount).toBeLessThan(shortBreak.newCount);
    expect(long.newCount).toBe(0);
  });

  it("never reduces revision — a returning user needs more of it, not less", async () => {
    const current = await planCounts(0);

    for (const days of [4, 10, 45]) {
      const away = await planCounts(days);
      expect(away.revisionCount).toBeGreaterThanOrEqual(current.revisionCount);
    }
  });

  it("still respects the available time budget after reallocating", async () => {
    const { plan } = await planCounts(10);
    expect(plan.estimatedTotalDurationSeconds).toBeLessThanOrEqual(MINUTES * 60);
  });

  it("greets a returning user and explains the reduction", async () => {
    const { plan } = await planCounts(10);

    expect(plan.returnAssessment.welcomeBackMessage).toContain("Welcome back");
    expect(plan.explanation.details.join(" ")).toContain("set aside");
  });

  it("says nothing to a user who studied today", async () => {
    const { plan } = await planCounts(0);
    expect(plan.returnAssessment.welcomeBackMessage).toBeNull();
  });
});
