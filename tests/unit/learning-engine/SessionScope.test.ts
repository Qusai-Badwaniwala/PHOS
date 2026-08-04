import { describe, expect, it } from "vitest";
import { ConfidenceLevel, MemoryState, SessionType, WorkloadCategory } from "@/shared/types";
import type {
  DailyStudyPlan,
  MemoryUpdateResult,
  Page,
  PlanItemExplanation,
  RecallEvent,
  RecallOutcome,
  Session,
  SessionItem,
} from "@/shared/types";
import type { IAdaptiveEngine } from "@/engines/adaptive/interfaces";
import type { IMemoryEngine } from "@/engines/memory";
import type {
  CreateSessionInput,
  CreateSessionItemInput,
  IPageRepository,
  IRecallEventRepository,
  ISessionRepository,
} from "@/repositories";
import { InvalidStudyItemError } from "@/engines/learning/errors";
import { LearningEngine, SESSION_TYPE_WORKLOAD_CATEGORIES } from "@/engines/learning";
import { NO_EXPLANATION, NOT_RETURNING, STEADY_WORKLOAD } from "../../support/planFixtures";

/**
 * A realistically ordered day: the Adaptive Engine ranks every category
 * by priority, so revision work always precedes new memorization
 * (`NewMemorization` has the lowest category base score by design).
 */
const MIXED_DAY_PLAN: DailyStudyPlan = {
  studyItems: [
    {
      pageId: "recovery-page",
      pageNumber: 10,
      memoryState: MemoryState.Fragile,
      workloadCategory: WorkloadCategory.Recovery,
      juzNumber: 1,
      recommendedOrder: 0,
      estimatedDurationSeconds: 60,
    },
    {
      pageId: "overdue-page",
      pageNumber: 20,
      memoryState: MemoryState.Growing,
      workloadCategory: WorkloadCategory.OverdueRevision,
      juzNumber: 1,
      recommendedOrder: 1,
      estimatedDurationSeconds: 60,
    },
    {
      pageId: "recent-page",
      pageNumber: 30,
      memoryState: MemoryState.Growing,
      workloadCategory: WorkloadCategory.RecentRevision,
      juzNumber: 1,
      recommendedOrder: 2,
      estimatedDurationSeconds: 60,
    },
    {
      pageId: "longterm-page",
      pageNumber: 40,
      memoryState: MemoryState.Stable,
      workloadCategory: WorkloadCategory.LongTermRevision,
      juzNumber: 1,
      recommendedOrder: 3,
      estimatedDurationSeconds: 60,
    },
    {
      pageId: "new-page",
      pageNumber: 50,
      memoryState: MemoryState.Unseen,
      workloadCategory: WorkloadCategory.NewMemorization,
      juzNumber: 1,
      recommendedOrder: 4,
      estimatedDurationSeconds: 60,
    },
  ],
  estimatedTotalDurationSeconds: 300,
  recoveryRecommended: true,
  availableStudyMinutes: 60,
  generatedAt: new Date(),
  explanation: NO_EXPLANATION,
  returnAssessment: NOT_RETURNING,
  workload: STEADY_WORKLOAD,
  workloadWarning: null,
};

class FakeAdaptiveEngine implements Partial<IAdaptiveEngine> {
  async generateDailyPlan(): Promise<DailyStudyPlan> {
    return MIXED_DAY_PLAN;
  }
  async explainPlan(): Promise<readonly PlanItemExplanation[]> {
    return [];
  }
}

class FakeMemoryEngine implements Partial<IMemoryEngine> {
  async applyRecallResult(outcome: RecallOutcome): Promise<MemoryUpdateResult> {
    const profile = {
      pageId: outcome.pageId,
      memoryState: MemoryState.Fragile,
      memoryStrength: 0.5,
      memoryStability: 1,
      difficulty: 0.5,
    };
    return { previousProfile: profile, updatedProfile: profile, stateChanged: false };
  }
}

class FakeSessionRepository implements Partial<ISessionRepository> {
  private sessions = new Map<string, Session>();
  private items = new Map<string, SessionItem[]>();
  private nextId = 1;

  async create(input: CreateSessionInput): Promise<Session> {
    const session: Session = {
      id: `session-${this.nextId++}`,
      sessionType: input.sessionType,
      startedAt: new Date(),
      completedAt: null,
      durationSeconds: null,
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    this.items.set(session.id, []);
    return session;
  }
  async complete(sessionId: string): Promise<Session> {
    const existing = this.sessions.get(sessionId);
    if (!existing) throw new Error("not found");
    const completed: Session = { ...existing, completedAt: new Date(), durationSeconds: 60 };
    this.sessions.set(sessionId, completed);
    return completed;
  }
  async findById(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }
  async findActive(): Promise<Session | null> {
    for (const session of this.sessions.values()) {
      if (!session.completedAt) return session;
    }
    return null;
  }
  async addSessionItem(item: CreateSessionItemInput): Promise<SessionItem> {
    const sessionItem: SessionItem = { id: `item-${Math.random()}`, ...item };
    const list = this.items.get(item.sessionId) ?? [];
    list.push(sessionItem);
    this.items.set(item.sessionId, list);
    return sessionItem;
  }
  async findSessionItems(sessionId: string): Promise<readonly SessionItem[]> {
    return this.items.get(sessionId) ?? [];
  }
}

class FakeRecallEventRepository implements Partial<IRecallEventRepository> {
  async findBySession(): Promise<readonly RecallEvent[]> {
    return [];
  }
}

class FakePageRepository implements Partial<IPageRepository> {
  async findById(id: string): Promise<Page | null> {
    return {
      id,
      pageNumber: 1,
      juzNumber: 1,
      memoryState: MemoryState.Growing,
      memoryStrength: 0.5,
      memoryStability: 2,
      difficulty: 0.5,
      firstStudiedAt: null,
      lastReviewedAt: null,
      lastSuccessfulRecallAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

function buildEngine() {
  return new LearningEngine({
    adaptiveEngine: new FakeAdaptiveEngine() as unknown as IAdaptiveEngine,
    memoryEngine: new FakeMemoryEngine() as unknown as IMemoryEngine,
    sessionRepository: new FakeSessionRepository() as unknown as ISessionRepository,
    recallEventRepository: new FakeRecallEventRepository() as unknown as IRecallEventRepository,
    pageRepository: new FakePageRepository() as unknown as IPageRepository,
  });
}

describe("SESSION_TYPE_WORKLOAD_CATEGORIES", () => {
  it("assigns every workload category to exactly one session type", () => {
    const assigned = Object.values(SESSION_TYPE_WORKLOAD_CATEGORIES).flat();
    const unique = new Set(assigned);

    // No category is claimed twice...
    expect(assigned).toHaveLength(unique.size);
    // ...and none is left unreachable by every session type.
    expect(unique).toEqual(new Set(Object.values(WorkloadCategory)));
  });
});

/**
 * Regression coverage for the session/plan scope mismatch.
 *
 * The Adaptive Engine returns one plan covering the whole day, ordered
 * by priority, so revision work always sits ahead of new memorization.
 * `submitRecall()` enforces strict sequential progression through the
 * loaded plan. Before this fix the *entire* day's plan was loaded into
 * every session, so a Sabaq session's cursor pointed at a revision page
 * and the first genuine new-memorization recall was rejected outright.
 */
describe("loadDailyPlan scopes the plan to the session's own type", () => {
  it("loads only new-memorization work for a Sabaq session", async () => {
    const engine = buildEngine();
    await engine.startSession(SessionType.Sabaq);
    const plan = await engine.loadDailyPlan(60);

    expect(plan.studyItems.map((i) => i.pageId)).toEqual(["new-page"]);
    expect(engine.getNextStudyItem()?.pageId).toBe("new-page");
  });

  it("loads both overdue and recent revision for a Sabqi session", async () => {
    const engine = buildEngine();
    await engine.startSession(SessionType.Sabqi);
    const plan = await engine.loadDailyPlan(60);

    expect(plan.studyItems.map((i) => i.pageId)).toEqual(["overdue-page", "recent-page"]);
  });

  it("loads only long-term revision for a Manzil session", async () => {
    const engine = buildEngine();
    await engine.startSession(SessionType.Manzil);
    const plan = await engine.loadDailyPlan(60);

    expect(plan.studyItems.map((i) => i.pageId)).toEqual(["longterm-page"]);
  });

  it("loads only recovery work for a Recovery session", async () => {
    const engine = buildEngine();
    await engine.startSession(SessionType.Recovery);
    const plan = await engine.loadDailyPlan(60);

    expect(plan.studyItems.map((i) => i.pageId)).toEqual(["recovery-page"]);
  });

  it("accepts a new-memorization recall in a Sabaq session even when revision is also scheduled", async () => {
    const engine = buildEngine();
    await engine.startSession(SessionType.Sabaq);
    await engine.loadDailyPlan(60);

    // Before the fix this threw InvalidStudyItemError, because the
    // cursor sat on "recovery-page" — the highest-priority item of the
    // whole day, which is not this session's work at all.
    expect(() => engine.submitRecall("new-page", true, 60)).not.toThrow();
    await expect(engine.submitConfidence(ConfidenceLevel.Medium)).resolves.toBeDefined();

    const summary = await engine.finishSession();
    expect(summary.pagesCompleted).toBe(1);
  });

  it("still rejects a recall for a page outside the session's scope", async () => {
    const engine = buildEngine();
    await engine.startSession(SessionType.Sabaq);
    await engine.loadDailyPlan(60);

    // Sequential progression remains enforced — scoping narrows which
    // pages belong to the session, it does not relax the invariant.
    expect(() => engine.submitRecall("longterm-page", true, 60)).toThrow(InvalidStudyItemError);
  });

  it("renumbers recommendedOrder densely from 0 within the scoped plan", async () => {
    const engine = buildEngine();
    await engine.startSession(SessionType.Sabqi);
    const plan = await engine.loadDailyPlan(60);

    expect(plan.studyItems.map((i) => i.recommendedOrder)).toEqual([0, 1]);
    expect(plan.estimatedTotalDurationSeconds).toBe(120);
  });
});
