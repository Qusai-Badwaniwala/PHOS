import { ReturnStatus } from "@/shared/types";
import type { PlanExplanation, ReturnAssessment, WorkloadSummary } from "@/shared/types";

/**
 * Neutral plan metadata for tests that are not about explanations or
 * returning users.
 *
 * `DailyStudyPlan` gained `explanation` and `returnAssessment` in
 * Phase 5. Fixtures for the session lifecycle and DTO mapping do not
 * care about either, so they take these defaults rather than restating
 * the same placeholder object in every file — a change to the shape
 * then updates one place, not several.
 */
export const NO_EXPLANATION: PlanExplanation = { headline: "", details: [] };

export const NOT_RETURNING: ReturnAssessment = {
  status: ReturnStatus.Current,
  daysSinceLastSession: 0,
  newMemorizationAllowance: 1,
  welcomeBackMessage: null,
};

/** Workload held at the user's stated pace — the neutral case. */
export const STEADY_WORKLOAD: WorkloadSummary = {
  recommendedNewPages: 1,
  basis: "onboarding",
  successRate: null,
  observedDailyPace: null,
  consistency: null,
  direction: "steady",
  rationale: "",
};
