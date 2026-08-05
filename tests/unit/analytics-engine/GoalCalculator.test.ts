import { describe, expect, it } from "vitest";
import { MemoryState, type MemorizationGoal, type Page } from "@/shared/types";
import {
  calculateGoalProjection,
  MINIMUM_ASSESSED_DAYS,
  PACE_WINDOW_DAYS,
} from "@/engines/analytics/calculators";

/**
 * The goal projection tells the user, in words, when they will finish.
 * It is the most confident-sounding thing PHOS says, so what it may and
 * may not claim is pinned here rather than left to the wording of a
 * card.
 */
const NOW = new Date(2026, 7, 5, 12, 0);
const MILLISECONDS_PER_DAY = 86_400_000;

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * MILLISECONDS_PER_DAY);
}

/**
 * `count` pages first studied evenly across `spreadDays` days, the most
 * recent of them `endingDaysAgo` ago.
 *
 * `spreadDays` is separate from `count` so a test can express a real
 * pace: 90 pages across 30 days is three a day, which is a different
 * user from 90 pages across 90 days.
 */
function memorizedPages(count: number, spreadDays = count, endingDaysAgo = 0): Page[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `page-${index + 1}`,
    pageNumber: index + 1,
    juzNumber: 1,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.6,
    memoryStability: 3,
    difficulty: 0.4,
    firstStudiedAt: daysBefore(
      endingDaysAgo + (spreadDays - 1 - Math.floor((index * spreadDays) / count)),
    ),
    lastReviewedAt: NOW,
    lastSuccessfulRecallAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  })) as unknown as Page[];
}

function unseenPages(count: number): Page[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `unseen-${index}`,
    pageNumber: 500 + index,
    juzNumber: 25,
    memoryState: MemoryState.Unseen,
    memoryStrength: 0,
    memoryStability: 0,
    difficulty: 0,
    createdAt: NOW,
    updatedAt: NOW,
  })) as unknown as Page[];
}

const GOAL: MemorizationGoal = {
  goalTargetPages: 604,
  goalTargetDate: new Date(2029, 2, 1),
};

describe("when there is no goal", () => {
  it("produces nothing at all, which is not an error", () => {
    // Most users never set one. A card that has nothing to say should
    // say nothing rather than render zeros.
    expect(
      calculateGoalProjection(
        memorizedPages(50),
        { goalTargetPages: null, goalTargetDate: null },
        NOW,
      ),
    ).toBeNull();
  });

  it("refuses half a goal", () => {
    expect(
      calculateGoalProjection(
        memorizedPages(50),
        { goalTargetPages: 604, goalTargetDate: null },
        NOW,
      ),
    ).toBeNull();
  });
});

describe("the evidence gate", () => {
  it("withholds a pace and a date until there is enough history", () => {
    /*
     * Three days of data can produce a completion date, and that date
     * is noise — two good days would promise the whole Mushaf inside a
     * year. The same discipline that keeps Memory Health blank until a
     * real recall exists.
     */
    const projection = calculateGoalProjection(memorizedPages(6), GOAL, NOW)!;

    expect(projection.assessedDays).toBeLessThan(MINIMUM_ASSESSED_DAYS);
    expect(projection.observedPagesPerDay).toBeNull();
    expect(projection.projectedCompletionDate).toBeNull();
    expect(projection.daysFromGoal).toBeNull();
  });

  it("still reports the facts it does know", () => {
    // Withholding the projection must not withhold the count. "You have
    // 6 of 604" is true and useful on day one.
    const projection = calculateGoalProjection(memorizedPages(6), GOAL, NOW)!;

    expect(projection.pagesMemorized).toBe(6);
    expect(projection.pagesRemaining).toBe(598);
    expect(projection.targetPages).toBe(604);
  });

  it("projects once enough days have been recorded", () => {
    const projection = calculateGoalProjection(memorizedPages(20), GOAL, NOW)!;

    expect(projection.assessedDays).toBeGreaterThanOrEqual(MINIMUM_ASSESSED_DAYS);
    expect(projection.observedPagesPerDay).toBeCloseTo(1);
    expect(projection.projectedCompletionDate).toBeInstanceOf(Date);
  });
});

describe("measuring pace", () => {
  it("counts new memorization, not revision", () => {
    // Pace comes from when a page left `Unseen`, so a day spent
    // entirely on revision correctly counts as zero new pages.
    const projection = calculateGoalProjection(memorizedPages(30), GOAL, NOW)!;

    expect(projection.observedPagesPerDay).toBeCloseTo(1);
  });

  it("measures against how long the user has actually been going, not a fixed window", () => {
    /*
     * Someone ten days in must not be told their pace is a third of
     * what it is because the window assumed thirty days.
     */
    const projection = calculateGoalProjection(memorizedPages(10), GOAL, NOW)!;

    expect(projection.assessedDays).toBe(10);
    expect(projection.observedPagesPerDay).toBeCloseTo(1);
  });

  it("ignores memorization older than the window, so a past burst does not flatter today", () => {
    // 60 pages finished well before the window, 10 inside it.
    const old = memorizedPages(60, 20, PACE_WINDOW_DAYS + 5);
    const recent = memorizedPages(10).map((page, index) => ({ ...page, id: `recent-${index}` }));

    const projection = calculateGoalProjection([...old, ...recent], GOAL, NOW)!;

    expect(projection.pagesMemorized).toBe(70);
    // Only the recent ten count toward pace.
    expect(projection.observedPagesPerDay! * projection.assessedDays).toBeCloseTo(10);
  });

  it("says it does not know rather than saying zero, when nothing recent was recorded", () => {
    /*
     * "PHOS does not know yet" and "you have stopped" are different
     * statements. Someone who paused for a month should not be shown a
     * completion date of never.
     */
    const projection = calculateGoalProjection(
      memorizedPages(60, 20, PACE_WINDOW_DAYS + 5),
      GOAL,
      NOW,
    )!;

    expect(projection.observedPagesPerDay).toBeNull();
    expect(projection.projectedCompletionDate).toBeNull();
  });
});

describe("the projection itself", () => {
  it("lands later than the goal when the pace is too slow, and says by how much", () => {
    // 20 pages across 20 days = 1/day, 584 remaining ≈ 584 days, against
    // a goal about 10 months out.
    const projection = calculateGoalProjection(
      memorizedPages(20),
      { goalTargetPages: 604, goalTargetDate: new Date(2027, 5, 1) },
      NOW,
    )!;

    expect(projection.observedPagesPerDay).toBeCloseTo(1);
    expect(projection.daysFromGoal).toBeGreaterThan(0);
    expect(projection.projectedCompletionDate!.getTime()).toBeGreaterThan(
      new Date(2027, 5, 1).getTime(),
    );
  });

  it("lands before the goal when the pace is fast enough", () => {
    // 90 pages across 30 days = 3/day, 514 remaining ≈ 172 days.
    const projection = calculateGoalProjection(memorizedPages(90, 30), GOAL, NOW)!;

    expect(projection.observedPagesPerDay).toBeCloseTo(3);
    expect(projection.daysFromGoal).toBeLessThan(0);
    expect(projection.projectedCompletionDate!.getTime()).toBeLessThan(
      GOAL.goalTargetDate!.getTime(),
    );
  });

  it("counts only pages that have actually been started", () => {
    const projection = calculateGoalProjection(
      [...memorizedPages(20), ...unseenPages(100)],
      GOAL,
      NOW,
    )!;

    expect(projection.pagesMemorized).toBe(20);
  });
});

describe("reaching the target", () => {
  it("reports it plainly and stops projecting a date", () => {
    const projection = calculateGoalProjection(
      memorizedPages(30),
      { goalTargetPages: 25, goalTargetDate: new Date(2029, 2, 1) },
      NOW,
    )!;

    expect(projection.targetReached).toBe(true);
    expect(projection.pagesRemaining).toBe(0);
    // A completion date for something already complete would be noise.
    expect(projection.projectedCompletionDate).toBeNull();
  });
});

describe("a goal whose date has passed", () => {
  it("still projects, rather than refusing to answer", () => {
    // The honest answer is "you would reach it around <date>, which is
    // after the day you had chosen" — not silence.
    const projection = calculateGoalProjection(
      memorizedPages(20),
      { goalTargetPages: 604, goalTargetDate: new Date(2026, 0, 1) },
      NOW,
    )!;

    expect(projection.projectedCompletionDate).toBeInstanceOf(Date);
    expect(projection.daysFromGoal).toBeGreaterThan(0);
  });
});
