import { describe, expect, it } from "vitest";
import { ConfidenceLevel, MemoryState } from "@/shared/types";
import type { Page, RecallEvent } from "@/shared/types";
import { calculateMemoryHealth, calculateRetentionQuality } from "@/engines/analytics/calculators";

function buildPage(overrides: Partial<Page> = {}): Page {
  return {
    id: "page-1",
    pageNumber: 1,
    juzNumber: 1,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.5,
    memoryStability: 5,
    difficulty: 0.3,
    firstStudiedAt: null,
    lastReviewedAt: new Date(),
    lastSuccessfulRecallAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildEvent(overrides: Partial<RecallEvent> = {}): RecallEvent {
  return {
    id: "event-1",
    pageId: "page-1",
    sessionId: "session-1",
    timestamp: new Date(),
    successfulRecall: true,
    confidence: ConfidenceLevel.Medium,
    durationSeconds: 10,
    ...overrides,
  };
}

describe("calculateMemoryHealth", () => {
  it("returns 0 when no pages have ever been reviewed", () => {
    const pages = [buildPage({ memoryState: MemoryState.Unseen })];
    expect(calculateMemoryHealth(pages, new Date()).score).toBe(0);
  });

  it("excludes Unseen pages from the calculation", () => {
    const reviewed = buildPage({ memoryStrength: 1, memoryStability: 100 });
    const unseen = buildPage({ id: "page-2", memoryState: MemoryState.Unseen, memoryStrength: 0 });
    const withUnseen = calculateMemoryHealth([reviewed, unseen], new Date()).score;
    const withoutUnseen = calculateMemoryHealth([reviewed], new Date()).score;
    expect(withUnseen).toBe(withoutUnseen);
  });

  it("scores a fully strong, fully stable page near 100", () => {
    const page = buildPage({ memoryStrength: 1, memoryStability: 100 });
    expect(calculateMemoryHealth([page], new Date()).score).toBe(100);
  });

  it("is deterministic", () => {
    const pages = [buildPage()];
    const date = new Date();
    expect(calculateMemoryHealth(pages, date).score).toBe(calculateMemoryHealth(pages, date).score);
  });
});

describe("calculateRetentionQuality", () => {
  it("returns 0 when there is no recall history", () => {
    expect(calculateRetentionQuality([], new Date()).score).toBe(0);
  });

  it("returns 100 when every recall succeeded", () => {
    const events = [buildEvent({ successfulRecall: true }), buildEvent({ successfulRecall: true })];
    expect(calculateRetentionQuality(events, new Date()).score).toBe(100);
  });

  it("returns 50 for an even split of successes and failures", () => {
    const events = [
      buildEvent({ successfulRecall: true }),
      buildEvent({ successfulRecall: false }),
    ];
    expect(calculateRetentionQuality(events, new Date()).score).toBe(50);
  });
});
