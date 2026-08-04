import { describe, expect, it } from "vitest";
import { ConfidenceLevel, MemoryState } from "@/shared/types";
import type { Page, RecallEvent } from "@/shared/types";
import type {
  CreateRecallEventInput,
  IPageRepository,
  IRecallEventRepository,
  MemoryVariableUpdate,
  ReviewTimestampUpdate,
} from "@/repositories";
import { MemoryEngine } from "@/engines/memory";

/** Minimal in-memory fake — only what MemoryEngine actually calls. */
class FakePageRepository implements Partial<IPageRepository> {
  constructor(private page: Page) {}

  async findById(id: string): Promise<Page | null> {
    return id === this.page.id ? this.page : null;
  }

  async updateMemoryVariables(_pageId: string, values: MemoryVariableUpdate): Promise<Page> {
    this.page = { ...this.page, ...values };
    return this.page;
  }

  async updateMemoryState(_pageId: string, state: MemoryState): Promise<Page> {
    this.page = { ...this.page, memoryState: state };
    return this.page;
  }

  async updateReviewTimestamps(_pageId: string, timestamps: ReviewTimestampUpdate): Promise<Page> {
    this.page = { ...this.page, ...timestamps };
    return this.page;
  }

  getPage(): Page {
    return this.page;
  }
}

class FakeRecallEventRepository implements Partial<IRecallEventRepository> {
  readonly created: CreateRecallEventInput[] = [];

  async create(event: CreateRecallEventInput): Promise<RecallEvent> {
    this.created.push(event);
    return { id: `recall-${this.created.length}`, ...event };
  }
}

function buildPage(overrides: Partial<Page> = {}): Page {
  return {
    id: "page-1",
    pageNumber: 1,
    juzNumber: 1,
    memoryState: MemoryState.Unseen,
    memoryStrength: 0,
    memoryStability: 0,
    difficulty: 0,
    firstStudiedAt: null,
    lastReviewedAt: null,
    lastSuccessfulRecallAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("MemoryEngine.applyRecallResult", () => {
  it("moves a brand-new page from Unseen to Encoding on its first recall and records the event", async () => {
    const pageRepository = new FakePageRepository(buildPage());
    const recallEventRepository = new FakeRecallEventRepository();
    const engine = new MemoryEngine({
      pageRepository: pageRepository as unknown as IPageRepository,
      recallEventRepository: recallEventRepository as unknown as IRecallEventRepository,
    });

    const result = await engine.applyRecallResult({
      pageId: "page-1",
      sessionId: "session-1",
      successfulRecall: true,
      confidence: ConfidenceLevel.High,
      durationSeconds: 20,
      secondsSinceLastReview: null,
      timestamp: new Date(),
    });

    expect(result.updatedProfile.memoryState).toBe(MemoryState.Encoding);
    expect(result.stateChanged).toBe(true);
    expect(pageRepository.getPage().memoryState).toBe(MemoryState.Encoding);
    expect(pageRepository.getPage().lastReviewedAt).not.toBeNull();
    expect(pageRepository.getPage().lastSuccessfulRecallAt).not.toBeNull();
    expect(recallEventRepository.created).toHaveLength(1);
    expect(recallEventRepository.created[0]?.successfulRecall).toBe(true);
  });

  it("does not set lastSuccessfulRecallAt on a failed recall", async () => {
    const pageRepository = new FakePageRepository(
      buildPage({ memoryState: MemoryState.Encoding, memoryStrength: 0.3 }),
    );
    const recallEventRepository = new FakeRecallEventRepository();
    const engine = new MemoryEngine({
      pageRepository: pageRepository as unknown as IPageRepository,
      recallEventRepository: recallEventRepository as unknown as IRecallEventRepository,
    });

    await engine.applyRecallResult({
      pageId: "page-1",
      sessionId: "session-1",
      successfulRecall: false,
      confidence: ConfidenceLevel.Low,
      durationSeconds: 15,
      secondsSinceLastReview: 3600,
      timestamp: new Date(),
    });

    expect(pageRepository.getPage().lastSuccessfulRecallAt).toBeNull();
    expect(pageRepository.getPage().lastReviewedAt).not.toBeNull();
  });
});
