import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryState } from "@/shared/types";
import type { Page } from "@/shared/types";
import { estimatePageDurationSeconds } from "@/engines/adaptive/calculators";
import { DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive/constants";
import { PRIOR_MEMORIZATION_DIFFICULTY } from "@/engines/memory";

/**
 * The revision cycle onboarding seeds must be one the scheduler can
 * actually fit into the day the user described.
 *
 * These are two different modules holding two different opinions about
 * how long a page takes, and they drifted. Seeding assumed "about a
 * minute" and sized the cycle at `floor(minutes × 0.8)` pages a day;
 * the Adaptive Engine charges `base + difficulty × weight`, which for a
 * seeded page is 105 seconds. So PHOS handed every user with prior
 * memorization ~75% more daily revision than its own clock could take.
 *
 * That overflow did not evaporate. Revision that does not fit rolls
 * forward as *overdue*, overdue revision outranks new memorization, and
 * within days the user was told "No assignment scheduled" and stayed
 * told it. Reproduced on a first run with default answers.
 *
 * This test binds the two modules together deliberately: it asks the
 * real duration calculator, with the real config, what a real seeded
 * page costs. Retuning `baseDurationSeconds` keeps it passing, because
 * the capacity moves with it. Reintroducing an independent guess of the
 * per-page cost anywhere fails it.
 */
const adaptiveEngine = vi.hoisted(() => ({ estimateSessionDuration: vi.fn() }));

vi.mock("@/client/container", () => ({
  container: { adaptiveEngine },
}));

const { estimateDailyRevisionCapacity } = await import("@/client/operations/settings");

/** Exactly what seeding writes, so the cost is the real one. */
function seededPage(): Page {
  return {
    id: "seeded",
    pageNumber: 1,
    juzNumber: 1,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.6,
    memoryStability: 7,
    difficulty: PRIOR_MEMORIZATION_DIFFICULTY,
    firstStudiedAt: null,
    lastReviewedAt: new Date(),
    lastSuccessfulRecallAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const SECONDS_PER_SEEDED_PAGE = estimatePageDurationSeconds(seededPage(), DEFAULT_ADAPTIVE_CONFIG);

beforeEach(() => {
  vi.clearAllMocks();
  adaptiveEngine.estimateSessionDuration.mockImplementation((page: Pick<Page, "difficulty">) =>
    estimatePageDurationSeconds(page, DEFAULT_ADAPTIVE_CONFIG),
  );
});

describe("the daily revision capacity onboarding seeds against", () => {
  it("asks the engine what a page costs instead of assuming", () => {
    estimateDailyRevisionCapacity(60);

    expect(adaptiveEngine.estimateSessionDuration).toHaveBeenCalledWith({
      difficulty: PRIOR_MEMORIZATION_DIFFICULTY,
    });
  });

  it.each([5, 15, 30, 45, 60, 90, 120, 240, 960])(
    "never schedules more revision than %i minutes can hold",
    (minutes) => {
      const pages = estimateDailyRevisionCapacity(minutes);

      expect(pages * SECONDS_PER_SEEDED_PAGE).toBeLessThanOrEqual(minutes * 60);
    },
  );

  it("still moves a page forward on the shortest day PHOS accepts", () => {
    // The onboarding minimum is 5 minutes. A cycle of zero pages a day
    // would divide by zero downstream and seed nothing at all.
    expect(estimateDailyRevisionCapacity(5)).toBeGreaterThanOrEqual(1);
  });

  it("spends the day it was given rather than leaving most of it idle", () => {
    // The guard above is satisfied by returning 1 for every input. This
    // is the other half: a 60-minute day should be most of a 60-minute
    // day, not a token page.
    const pages = estimateDailyRevisionCapacity(60);

    expect(pages * SECONDS_PER_SEEDED_PAGE).toBeGreaterThan(60 * 60 * 0.9);
  });
});
