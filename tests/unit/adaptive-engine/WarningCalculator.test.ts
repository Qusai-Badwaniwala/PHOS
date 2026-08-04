import { describe, expect, it } from "vitest";
import { MemoryState, WorkloadCategory } from "@/shared/types";
import type { Page } from "@/shared/types";
import { detectWorkloadWarning } from "@/engines/adaptive/calculators";
import type { RankedPage } from "@/engines/adaptive/calculators";

/**
 * PRODUCT_REQUIREMENTS Requirement 7: "Preventing burnout is better
 * than maximizing daily workload" — balanced against Requirement 9's
 * "PHOS recommends. The user decides."
 *
 * The design decision under test is that PHOS *warns* rather than caps.
 * A hard revision limit would leave genuinely due pages unreviewed,
 * letting them decay and return as Recovery work.
 */
function ranked(category: WorkloadCategory, seconds = 60): RankedPage {
  const page: Page = {
    id: `page-${Math.random()}`,
    pageNumber: 1,
    juzNumber: 1,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.6,
    memoryStability: 3,
    difficulty: 0.5,
    firstStudiedAt: null,
    lastReviewedAt: null,
    lastSuccessfulRecallAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { page, category, priorityScore: 1, estimatedDurationSeconds: seconds };
}

function plan(count: number, category = WorkloadCategory.RecentRevision): RankedPage[] {
  return Array.from({ length: count }, () => ranked(category));
}

describe("detectWorkloadWarning", () => {
  it("says nothing on an ordinary day", () => {
    // Both sit inside the 30-minute budget at a minute a page, and
    // well under the page-count threshold.
    expect(detectWorkloadWarning(plan(10), 30)).toBeNull();
    expect(detectWorkloadWarning(plan(20), 30)).toBeNull();
  });

  it("says nothing when there is no work", () => {
    expect(detectWorkloadWarning([], 30)).toBeNull();
  });

  it("tolerates a handful of pages spilling to tomorrow", () => {
    // A small overflow is ordinary; warning about it daily would be
    // exactly the noise Requirement 4 rules out.
    expect(detectWorkloadWarning(plan(20), 30, 3)).toBeNull();
  });

  it("speaks up when a real backlog is building", () => {
    // The plan always fits the budget, so "the day ran over" can never
    // happen — what the user cannot otherwise see is that pages were
    // due and displaced.
    const warning = detectWorkloadWarning(plan(30), 30, 25);

    expect(warning).not.toBeNull();
    expect(warning!.message).toContain("did not fit");
  });

  it("speaks up on sheer page count even with nothing displaced", () => {
    const warning = detectWorkloadWarning(plan(50), 120, 0);
    expect(warning).not.toBeNull();
    expect(warning!.estimatedMinutes).toBe(50);
  });

  it("offers only long-term checks as deferrable, never recovery or overdue work", () => {
    const mixed = [
      ...plan(10, WorkloadCategory.Recovery),
      ...plan(10, WorkloadCategory.OverdueRevision),
      ...plan(25, WorkloadCategory.LongTermRevision),
    ];

    const warning = detectWorkloadWarning(mixed, 60);

    expect(warning).not.toBeNull();
    // Postponing recovery or overdue work is what costs most, so it is
    // never what PHOS suggests dropping.
    expect(warning!.deferrablePages).toBe(25);
  });

  it("reports nothing deferrable when every page is urgent", () => {
    const warning = detectWorkloadWarning(plan(60, WorkloadCategory.Recovery), 60);

    expect(warning!.deferrablePages).toBe(0);
    expect(warning!.message).toContain("rescheduled");
  });

  it("reassures rather than reprimands, on both wordings", () => {
    const withDeferrable = detectWorkloadWarning(
      [...plan(30, WorkloadCategory.LongTermRevision), ...plan(30, WorkloadCategory.Recovery)],
      60,
    )!;
    const withoutDeferrable = detectWorkloadWarning(plan(60, WorkloadCategory.Recovery), 60)!;

    // Both must make the same promise: skipping costs nothing, because
    // unstudied pages are simply rescheduled.
    expect(withDeferrable.message.toLowerCase()).toContain("nothing you skip is lost");
    expect(withoutDeferrable.message.toLowerCase()).toContain("rescheduled");

    for (const message of [withDeferrable.message, withoutDeferrable.message]) {
      const lower = message.toLowerCase();
      for (const word of ["fail", "behind", "must ", "should have"]) {
        expect(lower).not.toContain(word);
      }
    }
  });
});
