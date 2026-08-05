import type { Exam, ExamStatus } from "@/shared/types";

/** Everything needed to book an exam. */
export interface ExamCreate {
  readonly stage: number | null;
  readonly juzNumbers: readonly number[];
  readonly examDate: Date;
  readonly includeNewMemorization: boolean;
}

/**
 * An exam the user passed before PHOS was involved.
 *
 * A separate shape from `ExamCreate` on purpose. The two differ in
 * every field that matters — no future date, no run-up preference, and
 * a status of `Passed` from the moment it exists — and folding them
 * into one call with optional fields would make it possible to create a
 * scheduled exam with no date, which is not a state PHOS can plan for.
 */
export interface PastExamRecord {
  readonly stage: number | null;
  readonly juzNumbers: readonly number[];
  /** `null` when the user did not give one. */
  readonly examDate: Date | null;
}

/**
 * Exam storage (Phase 11).
 *
 * Deliberately narrow. An exam is a plain record of a decision the user
 * made — which Juz, which day — and carries no derived state: whether a
 * stage is unlocked, how the run-up divides, and how many pages fell
 * behind are all computed from pages and recall history at the moment
 * they are asked for. Storing any of them would be storing an insight
 * rather than a fact, and would go stale the first time the user
 * memorized a page.
 */
export interface IExamRepository {
  findAll(): Promise<readonly Exam[]>;
  findById(id: string): Promise<Exam | null>;
  /**
   * The exam currently being prepared for: the soonest `Scheduled` one
   * whose date has not passed.
   *
   * At most one exam is ever active. Two overlapping coverage schedules
   * would compete for the same days and neither would be honoured, so
   * `create()` rejects a second booking rather than letting the reader
   * pick a winner.
   */
  findActive(referenceDate: Date): Promise<Exam | null>;
  create(exam: ExamCreate): Promise<Exam>;
  /**
   * Stores an exam the user passed before PHOS existed for them.
   *
   * Never returned by `findActive()`: it is `Passed` on arrival, so it
   * cannot become the exam PHOS is preparing for.
   */
  recordPast(record: PastExamRecord): Promise<Exam>;
  updateStatus(id: string, status: ExamStatus, passedAt: Date | null): Promise<Exam>;
  delete(id: string): Promise<void>;
  /**
   * Removes every exam. Used only by a full data reset.
   *
   * Exams are records of what happened, not preferences, so they belong
   * with sessions and recall events on the destructive side of the line
   * rather than with settings on the preserved side.
   */
  deleteAll(): Promise<number>;
}
