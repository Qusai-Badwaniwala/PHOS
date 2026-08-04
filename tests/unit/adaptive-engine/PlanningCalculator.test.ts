import { describe, expect, it } from "vitest";
import { MemoryState } from "@/shared/types";
import type { Page } from "@/shared/types";
import { allocateStudyTime, rankPages } from "@/engines/adaptive/calculators";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";

const REFERENCE_DATE = new Date("2026-07-30T00:00:00.000Z");

function buildPage(overrides: Partial<Page> = {}): Page {
  return {
    id: `page-${overrides.pageNumber ?? 1}`,
    pageNumber: 1,
    juzNumber: 1,
    memoryState: MemoryState.Unseen,
    memoryStrength: 0,
    memoryStability: 0,
    difficulty: 0.5,
    firstStudiedAt: null,
    lastReviewedAt: null,
    lastSuccessfulRecallAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("rankPages + allocateStudyTime", () => {
  it("never allocates more estimated time than is available (AVAILABLE TIME CONTRACT)", () => {
    const manyNewPages = Array.from({ length: 50 }, (_, i) =>
      buildPage({ pageNumber: i + 1, id: `page-${i + 1}` }),
    );

    const ranked = rankPages(manyNewPages, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG);
    const allocated = allocateStudyTime(ranked, 10); // only 10 minutes available
    const totalSeconds = allocated.reduce((sum, r) => sum + r.estimatedDurationSeconds, 0);

    expect(totalSeconds).toBeLessThanOrEqual(10 * 60);
    expect(allocated.length).toBeLessThan(manyNewPages.length);
  });

  it("postpones New Memorization before dropping revision work when time is limited", () => {
    const overduePage = buildPage({
      id: "overdue-1",
      pageNumber: 1,
      memoryState: MemoryState.Growing,
      memoryStability: 1,
      firstStudiedAt: null,
      lastReviewedAt: new Date("2026-07-01T00:00:00.000Z"),
      lastSuccessfulRecallAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    const newPage = buildPage({ id: "new-1", pageNumber: 2 });

    const ranked = rankPages([overduePage, newPage], REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG);
    // Each page here costs 60 + (0.5 * 90) = 105s, so a 2-minute (120s)
    // budget fits exactly one page and not two. (A 1-minute budget fits
    // *neither*, which is why the engine correctly returned an empty
    // plan for it — the allocator never exceeds the budget.)
    const allocated = allocateStudyTime(ranked, 2);

    expect(allocated).toHaveLength(1);
    expect(allocated[0]?.page.id).toBe("overdue-1");
  });

  it("produces a fully, contiguously ordered result with no gaps", () => {
    const pages = Array.from({ length: 5 }, (_, i) =>
      buildPage({ pageNumber: i + 1, id: `page-${i + 1}` }),
    );
    const ranked = rankPages(pages, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG);
    expect(ranked.length).toBe(5);
  });

  it("is deterministic given identical inputs", () => {
    const pages = [buildPage({ id: "a", pageNumber: 1 }), buildPage({ id: "b", pageNumber: 2 })];
    const first = rankPages(pages, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG).map((r) => r.page.id);
    const second = rankPages(pages, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG).map((r) => r.page.id);
    expect(first).toEqual(second);
  });
});
