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
import {
  ConfidenceSubmissionError,
  InvalidStudyItemError,
  SessionNotStartedError,
} from "@/engines/learning/errors";
import { LearningEngine } from "@/engines/learning";
import { NO_EXPLANATION, NOT_RETURNING, STEADY_WORKLOAD } from "../../support/planFixtures";

/**
 * Both items share one workload category on purpose.
 *
 * `loadDailyPlan()` narrows the day's plan to the categories the active
 * session's type is responsible for, so a fixture mixing categories
 * would only ever surface one item to a single session — this file is
 * about the session *lifecycle*, so it uses a plan that one session
 * legitimately owns end to end. Cross-category scoping is covered
 * separately in `SessionScope.test.ts`.
 */
const FIXED_PLAN: DailyStudyPlan = {
  studyItems: [
    {
      pageId: "page-1",
      pageNumber: 1,
      memoryState: MemoryState.Encoding,
      workloadCategory: WorkloadCategory.NewMemorization,
      juzNumber: 1,
      recommendedOrder: 0,
      estimatedDurationSeconds: 60,
    },
    {
      pageId: "page-2",
      pageNumber: 2,
      memoryState: MemoryState.Unseen,
      workloadCategory: WorkloadCategory.NewMemorization,
      juzNumber: 1,
      recommendedOrder: 1,
      estimatedDurationSeconds: 60,
    },
  ],
  estimatedTotalDurationSeconds: 120,
  recoveryRecommended: false,
  availableStudyMinutes: 10,
  generatedAt: new Date(),
  explanation: NO_EXPLANATION,
  returnAssessment: NOT_RETURNING,
  workload: STEADY_WORKLOAD,
  workloadWarning: null,
};

class FakeAdaptiveEngine implements Partial<IAdaptiveEngine> {
  async generateDailyPlan(): Promise<DailyStudyPlan> {
    return FIXED_PLAN;
  }
  async explainPlan(): Promise<readonly PlanItemExplanation[]> {
    return [];
  }
}

class FakeMemoryEngine implements Partial<IMemoryEngine> {
  readonly calls: RecallOutcome[] = [];

  async applyRecallResult(outcome: RecallOutcome): Promise<MemoryUpdateResult> {
    this.calls.push(outcome);
    return {
      previousProfile: {
        pageId: outcome.pageId,
        memoryState: MemoryState.Encoding,
        memoryStrength: 0,
        memoryStability: 0,
        difficulty: 0,
      },
      updatedProfile: {
        pageId: outcome.pageId,
        memoryState: MemoryState.Fragile,
        memoryStrength: 0.4,
        memoryStability: 1,
        difficulty: 0.5,
      },
      stateChanged: true,
    };
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
    const completed: Session = { ...existing, completedAt: new Date(), durationSeconds: 100 };
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
      memoryState: MemoryState.Encoding,
      memoryStrength: 0.2,
      memoryStability: 1,
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
  const adaptiveEngine = new FakeAdaptiveEngine();
  const memoryEngine = new FakeMemoryEngine();
  const sessionRepository = new FakeSessionRepository();
  const recallEventRepository = new FakeRecallEventRepository();
  const pageRepository = new FakePageRepository();

  const engine = new LearningEngine({
    adaptiveEngine: adaptiveEngine as unknown as IAdaptiveEngine,
    memoryEngine: memoryEngine as unknown as IMemoryEngine,
    sessionRepository: sessionRepository as unknown as ISessionRepository,
    recallEventRepository: recallEventRepository as unknown as IRecallEventRepository,
    pageRepository: pageRepository as unknown as IPageRepository,
  });

  return { engine, memoryEngine, sessionRepository };
}

describe("LearningEngine", () => {
  it("throws SessionNotStartedError if loadDailyPlan is called before startSession", async () => {
    const { engine } = buildEngine();
    await expect(engine.loadDailyPlan(30)).rejects.toThrow(SessionNotStartedError);
  });

  it("runs the full session lifecycle: start -> plan -> recall -> confidence -> finish", async () => {
    const { engine, memoryEngine } = buildEngine();

    const session = await engine.startSession(SessionType.Sabaq);
    expect(session.completedAt).toBeNull();

    const plan = await engine.loadDailyPlan(30);
    expect(plan.studyItems).toHaveLength(2);

    const firstItem = engine.getNextStudyItem();
    expect(firstItem?.pageId).toBe("page-1");

    // Recall then confidence, in that order (confidence collected after recall).
    engine.submitRecall("page-1", true, 20);
    const result = await engine.submitConfidence(ConfidenceLevel.High);
    expect(result.stateChanged).toBe(true);
    expect(memoryEngine.calls).toHaveLength(1);
    expect(memoryEngine.calls[0]?.successfulRecall).toBe(true);
    expect(memoryEngine.calls[0]?.confidence).toBe(ConfidenceLevel.High);

    // Session should have advanced to the second item.
    expect(engine.getNextStudyItem()?.pageId).toBe("page-2");

    engine.submitRecall("page-2", false, 15);
    await engine.submitConfidence(ConfidenceLevel.Low);
    expect(memoryEngine.calls).toHaveLength(2);

    const summary = await engine.finishSession();
    expect(summary.pagesCompleted).toBe(2);
  });

  it("rejects submitConfidence() when no recall is pending", async () => {
    const { engine } = buildEngine();
    // Sabaq, so the fixture's plan is actually in scope and the
    // rejection is genuinely about the missing recall rather than an
    // empty plan.
    await engine.startSession(SessionType.Sabaq);
    await engine.loadDailyPlan(30);

    await expect(engine.submitConfidence(ConfidenceLevel.Medium)).rejects.toThrow(
      ConfidenceSubmissionError,
    );
  });

  it("rejects a recall submitted out of sequence", async () => {
    const { engine } = buildEngine();
    // Sabaq, so both fixture items are loaded and the rejection is
    // genuinely about ordering within a populated plan.
    await engine.startSession(SessionType.Sabaq);
    await engine.loadDailyPlan(30);

    // page-2 is not the current item (page-1 is).
    expect(() => engine.submitRecall("page-2", true, 10)).toThrow(InvalidStudyItemError);
  });

  it("cancelSession leaves the session incomplete rather than marking it complete", async () => {
    const { engine, sessionRepository } = buildEngine();
    const session = await engine.startSession(SessionType.Recovery);
    await engine.loadDailyPlan(30);
    await engine.cancelSession();

    const stored = await sessionRepository.findById(session.id);
    expect(stored?.completedAt).toBeNull();
  });
});
