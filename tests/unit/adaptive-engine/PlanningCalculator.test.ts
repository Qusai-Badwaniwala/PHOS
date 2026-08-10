import { describe, expect, it } from "vitest";
import { MemoryState, WorkloadCategory } from "@/shared/types";
import type { Page } from "@/shared/types";
import type { RankedPage } from "@/engines/adaptive/calculators";
import { allocateStudyTime, rankPages } from "@/engines/adaptive/calculators";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";

/** The pool as it would be with no new memorization permitted at all. */
function backlogOnly(ranked: readonly RankedPage[]): readonly RankedPage[] {
  return ranked.filter((r) => r.category !== WorkloadCategory.NewMemorization);
}

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

  /*
   * The defect this guards: postponed became abandoned.
   *
   * Revision that does not fit today is still due tomorrow, by then
   * *more* overdue and so ranked higher still. With pure priority order
   * a user whose revision fills their day was never offered another new
   * page again — not that day, not ever. Reproduced on a first run with
   * entirely ordinary answers ("several Juz", 60 minutes): 34 pages of
   * revision, 9 pages of daily overflow, and "No assignment scheduled".
   */
  describe("the new-memorization floor", () => {
    function backlog(count: number) {
      return Array.from({ length: count }, (_, i) =>
        buildPage({
          id: `rev-${i + 1}`,
          pageNumber: i + 1,
          memoryState: MemoryState.Growing,
          memoryStrength: 0.6,
          memoryStability: 3,
          lastReviewedAt: new Date("2026-07-20T00:00:00.000Z"),
          lastSuccessfulRecallAt: new Date("2026-07-20T00:00:00.000Z"),
        }),
      );
    }

    it("still offers a new page when revision alone would fill the whole day", () => {
      const pages = [...backlog(40), buildPage({ id: "new-1", pageNumber: 300 })];
      const ranked = rankPages(pages, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG);

      // 60 minutes fits 34 pages at 105s each; the 40 due pages alone
      // would take every second of it.
      const allocated = allocateStudyTime(ranked, 60);

      expect(allocated.filter((r) => r.category === WorkloadCategory.NewMemorization)).toHaveLength(
        1,
      );
    });

    it("pays for it out of the least urgent revision, never out of the clock", () => {
      const pages = [...backlog(40), buildPage({ id: "new-1", pageNumber: 300 })];
      const ranked = rankPages(pages, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG);
      const withoutNew = allocateStudyTime(backlogOnly(ranked), 60);
      const allocated = allocateStudyTime(ranked, 60);

      const seconds = allocated.reduce((sum, r) => sum + r.estimatedDurationSeconds, 0);
      expect(seconds).toBeLessThanOrEqual(60 * 60);

      // Exactly one revision page gave way — the one it could most
      // afford to defer, not a wholesale reshuffle.
      const revision = allocated.filter((r) => r.category !== WorkloadCategory.NewMemorization);
      expect(revision).toHaveLength(withoutNew.length - 1);
      expect(revision.map((r) => r.page.id)).not.toContain(
        withoutNew[withoutNew.length - 1]!.page.id,
      );
    });

    it("takes the next page in roadmap order, never an arbitrary one", () => {
      const pages = [
        ...backlog(40),
        buildPage({ id: "new-later", pageNumber: 320 }),
        buildPage({ id: "new-next", pageNumber: 300 }),
      ];
      const ranked = rankPages(pages, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG);
      const allocated = allocateStudyTime(ranked, 60);

      const newPages = allocated.filter((r) => r.category === WorkloadCategory.NewMemorization);
      expect(newPages.map((r) => r.page.id)).toEqual(["new-next"]);
    });

    /*
     * The floor bounds "retention wins"; it must not invert it. A day
     * with room for a single page is a genuinely tight day, not the
     * permanent stall the floor exists to break — so revision keeps it.
     */
    it("leaves revision the day when only one page fits at all", () => {
      const pages = [...backlog(1), buildPage({ id: "new-1", pageNumber: 300 })];
      const ranked = rankPages(pages, REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG);
      const allocated = allocateStudyTime(ranked, 2);

      expect(allocated).toHaveLength(1);
      expect(allocated[0]!.category).not.toBe(WorkloadCategory.NewMemorization);
    });

    /*
     * The floor may only protect a new page that survived the pacing
     * rules. `capNewMemorization()` strips new memorization entirely on
     * a day the daily target says to skip — half a page a day means one
     * page every second day — and the floor must not smuggle it back.
     */
    it("adds nothing when the day's pacing has already withheld new work", () => {
      const ranked = rankPages(backlog(40), REFERENCE_DATE, DEFAULT_ADAPTIVE_CONFIG);
      const allocated = allocateStudyTime(ranked, 60);

      expect(allocated.filter((r) => r.category === WorkloadCategory.NewMemorization)).toHaveLength(
        0,
      );
    });
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
