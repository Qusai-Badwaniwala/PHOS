import { describe, expect, it } from "vitest";
import { MemoryState, ReturnStatus, WorkloadCategory } from "@/shared/types";
import type { Page, ReturnAssessment } from "@/shared/types";
import { explainPlan } from "@/engines/adaptive/calculators";
import type { RankedPage } from "@/engines/adaptive/calculators";

/**
 * PRODUCT_REQUIREMENTS Requirement 4, "Transparent Recommendations":
 * explanations must be short, honest, non-judgmental, and must "match
 * actual adaptive-engine decisions" with "no misleading or fabricated
 * explanations".
 */
const NOT_RETURNING: ReturnAssessment = {
  status: ReturnStatus.Current,
  daysSinceLastSession: 0,
  newMemorizationAllowance: 1,
  welcomeBackMessage: null,
};

function ranked(category: WorkloadCategory, pageNumber: number): RankedPage {
  const page: Page = {
    id: `page-${pageNumber}`,
    pageNumber,
    juzNumber: 1,
    memoryState: MemoryState.Growing,
    memoryStrength: 0.5,
    memoryStability: 3,
    difficulty: 0.5,
    firstStudiedAt: null,
    lastReviewedAt: null,
    lastSuccessfulRecallAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { page, category, priorityScore: 1, estimatedDurationSeconds: 60 };
}

function baseInputs(allocated: RankedPage[]) {
  return {
    allocated,
    availableStudyMinutes: 30,
    returnAssessment: NOT_RETURNING,
    withheldByReturnPolicy: 0,
    withheldByDailyTarget: 0,
    dailyTarget: 1,
    revisionDroppedForTime: 0,
    workloadRationale: "",
  };
}

describe("explainPlan", () => {
  it("says nothing is due rather than inventing work", () => {
    const explanation = explainPlan(baseInputs([]));

    expect(explanation.headline).toContain("Nothing is due");
    expect(explanation.details).toHaveLength(0);
  });

  it("stays quiet on an ordinary day", () => {
    // "Routine operations should not constantly interrupt the user."
    const explanation = explainPlan(baseInputs([ranked(WorkloadCategory.NewMemorization, 1)]));

    expect(explanation.headline).not.toBe("");
    expect(explanation.details).toHaveLength(0);
  });

  it("explains recovery work in terms of what it protects", () => {
    const explanation = explainPlan(baseInputs([ranked(WorkloadCategory.Recovery, 1)]));

    const joined = explanation.details.join(" ");
    expect(joined).toContain("weakened");
    expect(joined.toLowerCase()).not.toContain("fail");
  });

  it("explains overdue revision", () => {
    const explanation = explainPlan(baseInputs([ranked(WorkloadCategory.OverdueRevision, 1)]));

    expect(explanation.details.join(" ")).toContain("revision point");
  });

  it("blames the time budget only for revision, which is what the clock actually governs", () => {
    const allocated = [ranked(WorkloadCategory.RecentRevision, 1)];

    const withDrop = explainPlan({ ...baseInputs(allocated), revisionDroppedForTime: 4 });
    const withoutDrop = explainPlan(baseInputs(allocated));

    expect(withDrop.details.join(" ")).toContain("30 minutes");
    expect(withoutDrop.details.join(" ")).not.toContain("30 minutes");
  });

  it("never blames the clock for pages the daily target held back", () => {
    // Regression test for a defect seen in the running app: a plan
    // capped to 1 page by the user's own daily target reported "59 pages
    // did not fit in 60 minutes", crediting the clock with an exclusion
    // it had no part in. Requirement 4: "No misleading or fabricated
    // explanations are shown."
    const explanation = explainPlan({
      ...baseInputs([ranked(WorkloadCategory.NewMemorization, 1)]),
      withheldByDailyTarget: 59,
      dailyTarget: 1,
      revisionDroppedForTime: 0,
    });

    const joined = explanation.details.join(" ");
    expect(joined).not.toContain("did not fit");
    expect(joined).not.toContain("30 minutes");
    expect(joined).toContain("daily target");
  });

  it("states the daily target in the user's own terms", () => {
    const explanation = explainPlan({
      ...baseInputs([ranked(WorkloadCategory.NewMemorization, 1)]),
      withheldByDailyTarget: 10,
      dailyTarget: 0.5,
    });

    expect(explanation.details.join(" ")).toContain("half a page a day");
  });

  it("explains new memorization withheld after a break, and says it returns", () => {
    const explanation = explainPlan({
      ...baseInputs([ranked(WorkloadCategory.RecentRevision, 1)]),
      withheldByReturnPolicy: 3,
    });

    const joined = explanation.details.join(" ");
    expect(joined).toContain("3 pages");
    expect(joined).toContain("return");
  });

  it("puts revision before new memorization in the headline", () => {
    // The headline must reflect the engine's actual priority order,
    // not a friendlier-sounding one.
    const explanation = explainPlan(
      baseInputs([
        ranked(WorkloadCategory.RecentRevision, 1),
        ranked(WorkloadCategory.NewMemorization, 2),
      ]),
    );

    expect(explanation.headline).toMatch(/revise.*new/i);
  });

  it("reports revision-only days as such after a long break", () => {
    const explanation = explainPlan({
      ...baseInputs([ranked(WorkloadCategory.RecentRevision, 1)]),
      returnAssessment: {
        status: ReturnStatus.LongBreak,
        daysSinceLastSession: 40,
        newMemorizationAllowance: 0,
        welcomeBackMessage: "Welcome back.",
      },
    });

    expect(explanation.headline).toContain("revision only");
  });
});
