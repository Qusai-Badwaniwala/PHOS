import { describe, expect, it } from "vitest";
import { MemoryState, WorkloadCategory } from "@/shared/types";
import type { DailyStudyPlan, StudyItem } from "@/shared/types";
import { toDailyStudyPlanDTO, toStudyItemDTO } from "@/shared/mappers";
import { NO_EXPLANATION, NOT_RETURNING, STEADY_WORKLOAD } from "../../support/planFixtures";

const STUDY_ITEM: StudyItem = {
  pageId: "page-1",
  pageNumber: 1,
  memoryState: MemoryState.Unseen,
  workloadCategory: WorkloadCategory.NewMemorization,
  juzNumber: 1,
  recommendedOrder: 0,
  estimatedDurationSeconds: 60,
};

/**
 * Regression coverage for the defect that made new memorization
 * unreachable: `toStudyItemDTO()` silently dropped `workloadCategory`,
 * while all three frontend adapters filtered today's plan on exactly
 * that field. Every scheduled page therefore fell through to Revision
 * and the Session page was permanently empty.
 *
 * These assertions fail against the pre-fix mapper.
 */
describe("toStudyItemDTO", () => {
  it("includes workloadCategory — the field the Session/Revision split is derived from", () => {
    const dto = toStudyItemDTO(STUDY_ITEM);
    expect(dto.workloadCategory).toBe(WorkloadCategory.NewMemorization);
  });

  it("preserves every category verbatim, so the frontend can distinguish them", () => {
    for (const category of Object.values(WorkloadCategory)) {
      const dto = toStudyItemDTO({ ...STUDY_ITEM, workloadCategory: category });
      expect(dto.workloadCategory).toBe(category);
    }
  });

  it("maps estimatedDurationSeconds onto the DTO's estimatedDuration", () => {
    expect(toStudyItemDTO(STUDY_ITEM).estimatedDuration).toBe(60);
  });
});

describe("toDailyStudyPlanDTO", () => {
  it("carries workloadCategory through for every study item", () => {
    const plan: DailyStudyPlan = {
      studyItems: [
        STUDY_ITEM,
        {
          ...STUDY_ITEM,
          pageId: "page-2",
          pageNumber: 2,
          workloadCategory: WorkloadCategory.OverdueRevision,
          juzNumber: 1,
          recommendedOrder: 1,
        },
      ],
      estimatedTotalDurationSeconds: 120,
      recoveryRecommended: false,
      availableStudyMinutes: 60,
      generatedAt: new Date(),
      explanation: NO_EXPLANATION,
      returnAssessment: NOT_RETURNING,
      workload: STEADY_WORKLOAD,
      workloadWarning: null,
    };

    const dto = toDailyStudyPlanDTO(plan);

    expect(dto.studyItems.map((item) => item.workloadCategory)).toEqual([
      WorkloadCategory.NewMemorization,
      WorkloadCategory.OverdueRevision,
    ]);
    expect(dto.estimatedTotalDurationSeconds).toBe(120);
    expect(dto.recoveryRecommended).toBe(false);
  });
});
