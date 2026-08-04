import type {
  DailyStudyPlan,
  MemorizationOrder,
  Page,
  PlanItemExplanation,
  WorkloadCategory,
} from "@/shared/types";

/**
 * Public contract of the Adaptive Engine (SDS Part 11 "PUBLIC
 * INTERFACE").
 *
 * The `generateDailyPlan()` and `explainPlan()` signatures here were
 * forward-declared in MODULE 06 (Learning Engine) since Part 12
 * requires the Learning Engine to depend on this interface. The
 * remaining methods are completed now, in MODULE 07.
 */
export interface IAdaptiveEngine {
  generateDailyPlan(availableStudyMinutes: number): Promise<DailyStudyPlan>;

  /** Priority Score for one page — an internal implementation detail, never persisted or exposed directly to the UI (SDS Part 11 "PRIORITY CALCULATION"). */
  calculatePriority(page: Page, referenceDate: Date): number;

  /** Categorizes and orders all currently-due pages by priority (SDS Part 11 `rankPages()`). */
  rankPages(pages: readonly Page[], referenceDate: Date): readonly Page[];

  /** Selects which ranked pages fit within the available time, protecting retention before expansion (SDS Part 11 `balanceWorkload()` / `allocateStudyTime()`). */
  balanceWorkload(pages: readonly Page[], availableStudyMinutes: number): readonly Page[];

  allocateStudyTime(pages: readonly Page[], availableStudyMinutes: number): readonly Page[];

  /** Whether Recovery Mode should be emphasized today, given the current set of pages (SDS Part 11 "RECOVERY MODE"). */
  recommendRecovery(pages: readonly Page[]): boolean;

  estimateSessionDuration(page: Page): number;

  explainPlan(plan: DailyStudyPlan): Promise<readonly PlanItemExplanation[]>;

  /**
   * Every page in the order the user intends to memorize them, per
   * their roadmap (PRODUCT_REQUIREMENTS Requirement 2).
   *
   * Distinct from `generateDailyPlan()`, which answers "what should I
   * study *today*". This answers "in what order does this user work
   * through the Mushaf at all", which onboarding needs to decide which
   * pages a user's existing memorization corresponds to — someone who
   * began at Juz 30 has memorized the *end* of the Mushaf, not the
   * beginning, and seeding the first N page numbers would record their
   * Hifz against the wrong pages entirely.
   *
   * Paused Juz are excluded, matching the roadmap's own semantics.
   *
   * `orderOverride` answers "what *would* the sequence be if I chose
   * this order?" without saving anything, so the onboarding wizard can
   * show the user what their answers will do before they commit. The
   * preview and the real seeding then run the same code, and cannot
   * disagree.
   */
  getMemorizationSequence(orderOverride?: MemorizationOrder): Promise<readonly Page[]>;
}

export type { WorkloadCategory };
