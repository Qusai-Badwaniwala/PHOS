import { describe, expect, it } from "vitest";
import { MemoryState, WorkloadCategory } from "@/shared/types";
import type { Page } from "@/shared/types";
import { categorizePage, calculatePriorityScore } from "@/engines/adaptive/calculators";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";

const REFERENCE_DATE = new Date("2026-07-30T00:00:00.000Z");

function buildPage(overrides: Partial<Page> = {}): Page {
  return {
    id: "page-1",
    pageNumber: 1,
    juzNumber: 1,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.6,
    memoryStability: 5,
    difficulty: 0.3,
    firstStudiedAt: null,
    lastReviewedAt: new Date("2026-07-25T00:00:00.000Z"),
    lastSuccessfulRecallAt: new Date("2026-07-25T00:00:00.000Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("categorizePage", () => {
  it("categorizes a never-reviewed page as NewMemorization", () => {
    const page = buildPage({
      memoryState: MemoryState.Unseen,
      firstStudiedAt: null,
      lastReviewedAt: null,
      lastSuccessfulRecallAt: null,
    });
    expect(categorizePage(page, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG)).toBe(
      WorkloadCategory.NewMemorization,
    );
  });

  it("categorizes a page whose last review failed as Recovery, regardless of state", () => {
    const page = buildPage({
      memoryState: MemoryState.Stable,
      firstStudiedAt: null,
      lastReviewedAt: new Date("2026-07-29T00:00:00.000Z"),
      lastSuccessfulRecallAt: new Date("2026-07-20T00:00:00.000Z"), // predates lastReviewedAt => failure
    });
    expect(categorizePage(page, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG)).toBe(
      WorkloadCategory.Recovery,
    );
  });

  it("categorizes a very weak page as Recovery even if its last review technically succeeded", () => {
    const page = buildPage({
      memoryStrength: 0.05,
      firstStudiedAt: null,
      lastReviewedAt: new Date("2026-07-29T00:00:00.000Z"),
      lastSuccessfulRecallAt: new Date("2026-07-29T00:00:00.000Z"),
    });
    expect(categorizePage(page, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG)).toBe(
      WorkloadCategory.Recovery,
    );
  });

  it("returns null (not due) for a recently and successfully reviewed page with high stability", () => {
    const page = buildPage({
      memoryStability: 30,
      firstStudiedAt: null,
      lastReviewedAt: new Date("2026-07-29T00:00:00.000Z"),
      lastSuccessfulRecallAt: new Date("2026-07-29T00:00:00.000Z"),
    });
    expect(categorizePage(page, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG)).toBeNull();
  });

  it("categorizes a due, still-consolidating page as RecentRevision", () => {
    const page = buildPage({
      memoryState: MemoryState.Fragile,
      memoryStability: 2,
      // 2.5 days ago: past the "due" threshold (stability * 1 = 2) but
      // below the "overdue" threshold (stability * 1.5 = 3), which is
      // the window this test exists to cover.
      firstStudiedAt: null,
      lastReviewedAt: new Date("2026-07-27T12:00:00.000Z"),
      lastSuccessfulRecallAt: new Date("2026-07-27T12:00:00.000Z"),
    });
    expect(categorizePage(page, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG)).toBe(
      WorkloadCategory.RecentRevision,
    );
  });

  it("categorizes a due, mature page as LongTermRevision", () => {
    const page = buildPage({
      memoryState: MemoryState.Stable,
      memoryStability: 2,
      // Same due-but-not-overdue window as the test above; only the
      // memory state differs, which is what selects LongTermRevision
      // over RecentRevision.
      firstStudiedAt: null,
      lastReviewedAt: new Date("2026-07-27T12:00:00.000Z"),
      lastSuccessfulRecallAt: new Date("2026-07-27T12:00:00.000Z"),
    });
    expect(categorizePage(page, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG)).toBe(
      WorkloadCategory.LongTermRevision,
    );
  });

  it("categorizes a significantly overdue page as OverdueRevision", () => {
    const page = buildPage({
      memoryState: MemoryState.Growing,
      memoryStability: 1,
      firstStudiedAt: null,
      lastReviewedAt: new Date("2026-07-01T00:00:00.000Z"), // ~29 days ago, well past 1.5-day overdue threshold
      lastSuccessfulRecallAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(categorizePage(page, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG)).toBe(
      WorkloadCategory.OverdueRevision,
    );
  });
});

describe("calculatePriorityScore", () => {
  it("always scores Recovery above every other category regardless of within-category factors", () => {
    const strongRecoveryPage = buildPage({
      memoryStrength: 0.24,
      difficulty: 0,
      memoryStability: 0.1,
    });
    const weakestOverduePage = buildPage({
      memoryStrength: 0,
      difficulty: 1,
      memoryStability: 0.1,
    });

    const recoveryScore = calculatePriorityScore(
      strongRecoveryPage,
      WorkloadCategory.Recovery,
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
    );
    const overdueScore = calculatePriorityScore(
      weakestOverduePage,
      WorkloadCategory.OverdueRevision,
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
    );

    expect(recoveryScore).toBeGreaterThan(overdueScore);
  });

  it("within the same category, a weaker page scores higher than a stronger one", () => {
    const weakPage = buildPage({ memoryStrength: 0.3 });
    const strongPage = buildPage({ memoryStrength: 0.9 });

    const weakScore = calculatePriorityScore(
      weakPage,
      WorkloadCategory.LongTermRevision,
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
    );
    const strongScore = calculatePriorityScore(
      strongPage,
      WorkloadCategory.LongTermRevision,
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
    );

    expect(weakScore).toBeGreaterThan(strongScore);
  });

  it("is deterministic", () => {
    const page = buildPage();
    const first = calculatePriorityScore(
      page,
      WorkloadCategory.LongTermRevision,
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
    );
    const second = calculatePriorityScore(
      page,
      WorkloadCategory.LongTermRevision,
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
    );
    expect(first).toBe(second);
  });
});
