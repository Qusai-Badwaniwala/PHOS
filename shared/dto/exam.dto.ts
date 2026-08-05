/**
 * Exam DTOs (Phase 11).
 *
 * Dates cross this boundary as ISO strings, matching every other DTO,
 * so nothing beyond the mapper has to know which fields were `Date`
 * objects inside an engine.
 */
export interface ExamDTO {
  readonly id: string;
  readonly stage: number | null;
  readonly juzNumbers: readonly number[];
  /** Readable scope, e.g. "Juz 1–5 + 26–30". */
  readonly scopeLabel: string;
  /** `null` for a retrospective record with no date given. */
  readonly examDate: string | null;
  /** True when this records something passed before PHOS was involved. */
  readonly recordedAsPast: boolean;
  readonly includeNewMemorization: boolean;
  readonly status: string;
  readonly passedAt: string | null;
}

export interface ExamStageDTO {
  readonly stage: number;
  readonly juzNumbers: readonly number[];
  readonly label: string;
  readonly state: string;
  readonly pagesMemorized: number;
  readonly pagesInScope: number;
  readonly examId: string | null;
  readonly examDate: string | null;
}

export interface ExamCoverageDayDTO {
  readonly date: string;
  readonly pageNumbers: readonly number[];
}

export interface ExamPlanDTO {
  readonly examId: string;
  readonly examDate: string;
  readonly daysRemaining: number;
  readonly pagesInScope: number;
  readonly todaysPageNumbers: readonly number[];
  readonly pagesPerDay: number;
  readonly exceedsDailyBudget: boolean;
  readonly estimatedMinutesPerDay: number;
}

export interface ExamAftermathDTO {
  readonly pagesFallenBehind: number;
  readonly weakestPageNumbers: readonly number[];
}

/** Everything the exam section of the Dashboard renders from. */
export interface ExamOverviewDTO {
  readonly stages: readonly ExamStageDTO[];
  /** The exam being prepared for, or `null`. */
  readonly active: ExamDTO | null;
  readonly activePlan: ExamPlanDTO | null;
  readonly activeCoverage: readonly ExamCoverageDayDTO[];
  /** Exams already sat, most recent first. */
  readonly past: readonly ExamDTO[];
  /**
   * What fell behind during the most recently passed exam, when there
   * is anything to report.
   */
  readonly aftermath: ExamAftermathDTO | null;
}
