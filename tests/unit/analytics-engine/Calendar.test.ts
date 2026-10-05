import { afterEach, expect, it, vi } from "vitest";
import { calculateGoalProjection } from "@/engines/analytics/calculators";
import { MemoryState, type Page } from "@/shared/types";

afterEach(() => vi.unstubAllEnvs());

function pages(dates: Date[]): Page[] {
  return dates.map((date, index) => ({
    id: `p-${index}`,
    pageNumber: index + 1,
    juzNumber: 1,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.6,
    memoryStability: 3,
    difficulty: 0.5,
    firstStudiedAt: date,
    lastReviewedAt: date,
    lastSuccessfulRecallAt: date,
    createdAt: date,
    updatedAt: date,
  }));
}

it("recognizes seven calendar days of evidence across spring daylight saving", () => {
  vi.stubEnv("TZ", "America/New_York");
  const now = new Date(2026, 2, 9, 12);
  const history = pages(Array.from({ length: 7 }, (_, index) => new Date(2026, 2, index + 3, 10)));
  const result = calculateGoalProjection(
    history,
    { goalTargetPages: 14, goalTargetDate: new Date(2026, 2, 16) },
    now,
  )!;
  expect(result.assessedDays).toBe(7);
  expect(result.observedPagesPerDay).toBe(1);
});

it("projects calendar dates across the extra hour in autumn", () => {
  vi.stubEnv("TZ", "America/New_York");
  const now = new Date(2026, 10, 1, 12);
  const history = pages(Array.from({ length: 7 }, (_, index) => new Date(2026, 9, index + 26, 10)));
  const result = calculateGoalProjection(
    history,
    { goalTargetPages: 8, goalTargetDate: new Date(2026, 10, 2) },
    now,
  )!;
  expect(result.projectedCompletionDate?.getDate()).toBe(2);
  expect(result.projectedCompletionDate?.getHours()).toBe(0);
  expect(result.daysFromGoal).toBe(0);
});
