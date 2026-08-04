import { describe, expect, it } from "vitest";
import { MemorizationOrder, MemoryState, resolveRoadmap, TOTAL_JUZ } from "@/shared/types";
import type { Page, RoadmapEntry } from "@/shared/types";
import { rankPages } from "@/engines/adaptive/calculators";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";

/**
 * PRODUCT_REQUIREMENTS Requirement 2, "Flexible Memorization Order".
 *
 * These tests are the behavioural half of the requirement: not "can a
 * roadmap be stored" but "does scheduling actually follow it". Before
 * Phase 4 the tie-break was `pageNumber` ascending, which silently
 * hard-coded the standard order for every user.
 */
const REFERENCE_DATE = new Date("2026-08-03T00:00:00.000Z");

/** Juz n covers roughly 20 pages; exact boundaries do not matter here. */
function pageInJuz(juzNumber: number, pageNumber: number, overrides: Partial<Page> = {}): Page {
  return {
    id: `page-${pageNumber}`,
    pageNumber,
    juzNumber,
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

function allEntries(paused: readonly number[] = []): RoadmapEntry[] {
  return Array.from({ length: TOTAL_JUZ }, (_, index) => ({
    id: `entry-${index + 1}`,
    juzNumber: index + 1,
    position: index,
    paused: paused.includes(index + 1),
  }));
}

describe("roadmap-driven scheduling", () => {
  const juz1Page = pageInJuz(1, 1);
  const juz30Page = pageInJuz(30, 600);

  it("schedules Juz 1 first under the standard order", () => {
    const roadmap = resolveRoadmap(MemorizationOrder.Standard, allEntries());
    const ranked = rankPages(
      [juz30Page, juz1Page],
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
      roadmap,
    );

    expect(ranked[0]?.page.juzNumber).toBe(1);
  });

  it("schedules Juz 30 first when the user starts there", () => {
    const roadmap = resolveRoadmap(MemorizationOrder.Juz30First, allEntries());
    const ranked = rankPages(
      [juz1Page, juz30Page],
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
      roadmap,
    );

    // The decisive assertion: the lower page number no longer wins.
    expect(ranked[0]?.page.juzNumber).toBe(30);
    expect(ranked[0]?.page.pageNumber).toBe(600);
  });

  it("keeps Mushaf page order within a Juz", () => {
    const roadmap = resolveRoadmap(MemorizationOrder.Standard, allEntries());
    const ranked = rankPages(
      [pageInJuz(1, 5), pageInJuz(1, 2), pageInJuz(1, 9)],
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
      roadmap,
    );

    expect(ranked.map((r) => r.page.pageNumber)).toEqual([2, 5, 9]);
  });

  it("does not offer new memorization from a paused Juz", () => {
    const roadmap = resolveRoadmap(MemorizationOrder.Standard, allEntries([1]));
    const ranked = rankPages(
      [juz1Page, juz30Page],
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
      roadmap,
    );

    expect(ranked.map((r) => r.page.juzNumber)).toEqual([30]);
  });

  it("still revises already-memorized pages in a paused Juz", () => {
    // Requirement 2: "Already memorized pages remain memorized. Only
    // future scheduling changes." Filtering revision by the roadmap
    // would strand real memorization work, which is the one thing
    // pausing must never do.
    const memorizedInPausedJuz = pageInJuz(1, 3, {
      memoryState: MemoryState.Growing,
      memoryStrength: 0.8,
      memoryStability: 1,
      firstStudiedAt: null,
      lastReviewedAt: new Date("2026-07-20T00:00:00.000Z"),
      lastSuccessfulRecallAt: new Date("2026-07-20T00:00:00.000Z"),
    });

    const roadmap = resolveRoadmap(MemorizationOrder.Standard, allEntries([1]));
    const ranked = rankPages(
      [memorizedInPausedJuz],
      REFERENCE_DATE,
      DEFAULT_ADAPTIVE_CONFIG,
      roadmap,
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.page.pageNumber).toBe(3);
  });

  it("falls back to Mushaf page order when no roadmap is supplied", () => {
    // Preserves the pre-Phase-4 behaviour for any caller — including
    // existing tests — that constructs the engine without roadmap
    // dependencies.
    const ranked = rankPages([juz30Page, juz1Page], REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG);
    expect(ranked[0]?.page.pageNumber).toBe(1);
  });
});
