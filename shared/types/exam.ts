/**
 * Exams (Phase 11).
 *
 * A Hifz exam is not a PHOS invention — it is how most institutions
 * actually measure progress, and it arrives on a fixed date the student
 * does not choose. Everything here exists to serve that date: a ladder
 * of stages that mirrors the usual sequence, and a coverage schedule
 * that guarantees every page in scope is revised before it arrives.
 *
 * WHY THIS IS NOT JUST "REVISE HARDER"
 * ------------------------------------
 * PHOS's normal scheduling optimises retention across the whole Mushaf
 * on an open-ended horizon. An exam is the opposite problem: a fixed
 * subset, a fixed deadline, and a requirement to *cover* rather than to
 * optimise. Spaced repetition would happily leave a well-known page
 * untouched for three weeks, which is correct for memory and wrong the
 * day before an exam on it.
 */

/** How an exam is progressing. */
export enum ExamStatus {
  /** Chosen, dated, and either upcoming or in progress. */
  Scheduled = "Scheduled",
  /** The user said they passed it. */
  Passed = "Passed",
  /** Called off. Kept rather than deleted, so the roadmap can show it happened. */
  Cancelled = "Cancelled",
}

export interface Exam {
  readonly id: string;
  /**
   * Its rung on the fixed ladder, 1–8, or `null` for a self-declared
   * exam over any Juz the user chose.
   */
  readonly stage: number | null;
  /** The Juz being examined, ascending. */
  readonly juzNumbers: readonly number[];
  /**
   * When the exam is, or was.
   *
   * `null` only for an exam recorded retrospectively whose date the
   * user did not give — nobody remembers the day they sat Juz 30. A
   * scheduled exam always has one, because a run-up with no deadline is
   * not a run-up.
   */
  readonly examDate: Date | null;
  /**
   * Whether new memorization continues during the run-up.
   *
   * Asked rather than assumed: a student sitting a stage they finished
   * months ago usually keeps going, while one sitting the Juz they just
   * completed usually stops. Both are legitimate.
   */
  readonly includeNewMemorization: boolean;
  readonly status: ExamStatus;
  /**
   * True when this is a record of something that happened before PHOS
   * was involved, rather than an exam PHOS scheduled and prepared for.
   *
   * The distinction is not cosmetic. `ExamAftermath` reports what PHOS
   * *set aside* during a run-up; an exam it never ran set nothing
   * aside, so reporting "31 pages fell behind while you prepared" for a
   * madrasa exam sat in 2024 would be inventing a consequence.
   */
  readonly recordedAsPast: boolean;
  readonly scheduledAt: Date;
  readonly passedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** One rung of the fixed ladder, before any user data is applied. */
export interface ExamStageDefinition {
  readonly stage: number;
  readonly juzNumbers: readonly number[];
  /** Short label, e.g. "Juz 30" or "Juz 1–5 + 26–30". */
  readonly label: string;
}

/**
 * Where a stage stands for this particular user.
 *
 * `Locked` is a statement about memorization, not about permission:
 * PHOS will not schedule an exam over pages the user has not started,
 * because the coverage schedule would be revising pages that do not
 * exist yet.
 */
export enum ExamStageState {
  /** Some page in scope has not been started. */
  Locked = "Locked",
  /** Every page in scope is memorized, and no exam is booked. */
  Available = "Available",
  /** An exam is booked for this stage. */
  Scheduled = "Scheduled",
  /** The user marked it passed. */
  Passed = "Passed",
}

export interface ExamStageProgress {
  readonly stage: number;
  readonly juzNumbers: readonly number[];
  readonly label: string;
  readonly state: ExamStageState;
  /** Pages in scope that have left `Unseen`. */
  readonly pagesMemorized: number;
  /** Pages in scope in total. */
  readonly pagesInScope: number;
  /** The booked exam, when one exists. */
  readonly examId: string | null;
  readonly examDate: Date | null;
}

/** One day of an exam's coverage schedule. */
export interface ExamCoverageDay {
  readonly date: Date;
  /** Page numbers to revise that day, ascending and contiguous. */
  readonly pageNumbers: readonly number[];
}

/**
 * An exam's run-up: what is covered on each remaining day, and whether
 * that fits in the time the user has.
 */
export interface ExamPlan {
  readonly examId: string;
  readonly examDate: Date;
  readonly daysRemaining: number;
  /** Every page in scope, ascending. */
  readonly pagesInScope: number;
  /** Today's share. */
  readonly todaysPageNumbers: readonly number[];
  readonly pagesPerDay: number;
  /**
   * Set when the day's coverage will not fit in the user's stated daily
   * minutes.
   *
   * A warning, never a trim. The scope is fixed by the exam and the
   * date is fixed by the institution, so there is nothing PHOS could
   * honestly remove — and students do make extra time in exam weeks.
   * See `ExamPlan` usage in the Adaptive Engine for why this suspends a
   * contract that holds everywhere else.
   */
  readonly exceedsDailyBudget: boolean;
  readonly estimatedMinutesPerDay: number;
}

/**
 * What was set aside while the exam ran.
 *
 * Reported once, after the exam is marked passed. During the run-up
 * PHOS says nothing about it: a student a week from an exam cannot act
 * on "eleven other pages are slipping", and telling them would only
 * divide their attention at the worst possible moment.
 */
export interface ExamAftermath {
  readonly pagesFallenBehind: number;
  readonly weakestPageNumbers: readonly number[];
}
