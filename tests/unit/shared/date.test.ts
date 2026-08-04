import { describe, expect, it } from "vitest";
import { isSameLocalDay, startOfLocalDay } from "@/shared/utils";

/**
 * Regression coverage for the UTC/local day-boundary split.
 *
 * `AdaptiveEngine.getPagesStudiedToday()` previously floored the epoch
 * millisecond value, which yields **UTC** midnight. For any user east of
 * UTC that made every session between local midnight and UTC midnight
 * belong to "yesterday", so pages studied that morning were immediately
 * rescheduled. `lib/api/dashboard.ts` meanwhile bucketed by local day,
 * so the two halves of the app disagreed about which day work fell on.
 */
describe("startOfLocalDay", () => {
  it("returns local midnight, not UTC midnight", () => {
    const midMorning = new Date(2026, 7, 3, 9, 30, 45, 123);
    const start = startOfLocalDay(midMorning);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(3);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });

  it("keeps the earliest local instant of the day inside that day", () => {
    // The exact case the old UTC flooring got wrong: just after local
    // midnight must still floor to *today*, never to yesterday.
    const justAfterMidnight = new Date(2026, 7, 3, 0, 0, 1);
    const start = startOfLocalDay(justAfterMidnight);

    expect(start.getDate()).toBe(3);
    expect(start.getTime()).toBeLessThanOrEqual(justAfterMidnight.getTime());
  });

  it("does not mutate its argument", () => {
    const original = new Date(2026, 7, 3, 9, 30);
    const snapshot = original.getTime();

    startOfLocalDay(original);

    expect(original.getTime()).toBe(snapshot);
  });

  it("is idempotent", () => {
    const start = startOfLocalDay(new Date(2026, 7, 3, 23, 59, 59));
    expect(startOfLocalDay(start).getTime()).toBe(start.getTime());
  });
});

describe("isSameLocalDay", () => {
  it("treats different times on one local day as the same day", () => {
    expect(isSameLocalDay(new Date(2026, 7, 3, 0, 0, 1), new Date(2026, 7, 3, 23, 59, 59))).toBe(
      true,
    );
  });

  it("distinguishes adjacent local days", () => {
    expect(isSameLocalDay(new Date(2026, 7, 3, 23, 59, 59), new Date(2026, 7, 4, 0, 0, 1))).toBe(
      false,
    );
  });
});
