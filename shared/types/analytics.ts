import type { SessionType } from "./enums";
import type { MemoryState, ReportingPeriod, TrendDirection } from "./enums";

/**
 * Memory Health: overall condition of the learner's current
 * memorization (SDS Part 14 "MEMORY HEALTH CONTRACT"). Always computed
 * on demand; never persisted. The SDS does not define the scale
 * `score` is expressed on — that is an implementation detail of
 * MODULE 08 (Analytics Engine), not a schema/type concern.
 */
export interface MemoryHealth {
  readonly score: number;
  readonly calculatedAt: Date;
  /**
   * How many pages the score was computed from.
   *
   * Reported because the score alone cannot distinguish "your memory is
   * at 45%" from "PHOS has never tested anything and is quoting its own
   * opening assumptions back at you". A user who has just finished
   * onboarding has pages carrying an estimated profile and zero recall
   * history; showing a confident percentage there presents an
   * assumption as a measurement. Consumers use this to decide whether
   * the number has earned the right to be displayed.
   */
  readonly assessedPages: number;
}

/**
 * Where the user's own goal stands, measured against what they have
 * actually done (Phase 10).
 *
 * Every field is arithmetic on recorded facts. Nothing here is an
 * opinion about whether the user is doing well, and nothing in PHOS may
 * present it as one: a projection that arrives later than the goal is
 * information about pace, not a verdict on effort.
 */
export interface GoalProjection {
  readonly targetPages: number;
  readonly targetDate: Date;
  readonly pagesMemorized: number;
  readonly pagesRemaining: number;

  /**
   * New pages per day, observed from when pages were actually first
   * studied — never the onboarding estimate.
   *
   * `null` when too little has been recorded to measure. That is a
   * different statement from "zero pages a day", and the two must never
   * be conflated: one means "PHOS does not know yet", the other means
   * "you have stopped".
   */
  readonly observedPagesPerDay: number | null;

  /**
   * Days of real history the pace was measured across.
   *
   * The same honesty gate as `MemoryHealth.assessedPages`: a projection
   * built on three days of data is arithmetic on noise, and consumers
   * use this to decide whether it has earned the right to be shown.
   */
  readonly assessedDays: number;

  /** When the target would be reached at the observed pace. `null` when pace is unknown. */
  readonly projectedCompletionDate: Date | null;

  /**
   * Days between the projection and the goal. Negative means ahead of
   * it, positive means later than it. `null` when pace is unknown.
   */
  readonly daysFromGoal: number | null;

  /** True once `pagesMemorized` has reached the target. */
  readonly targetReached: boolean;
}

/**
 * Retention Quality: long-term retention effectiveness
 * (SDS Part 14 "RETENTION QUALITY CONTRACT"). Computed; never
 * persisted.
 */
export interface RetentionQuality {
  readonly score: number;
  readonly calculatedAt: Date;
  /** How many recall events the score was computed from. See `MemoryHealth.assessedPages`. */
  readonly assessedRecallEvents: number;
}

/**
 * Computed statistics for one completed session
 * (SDS Part 14 "SESSION ANALYTICS").
 */
export interface SessionStatistics {
  readonly sessionId: string;
  /**
   * Which kind of work this was.
   *
   * Carried because "Completed session" is what the history said for a
   * revision as much as for new memorization, which made a record of
   * the day's work unable to describe the day's work.
   */
  readonly sessionType: SessionType;
  readonly startedAt: Date;
  readonly durationSeconds: number;
  readonly pagesCompleted: number;
  /**
   * The pages themselves, ascending — not just how many.
   *
   * A count answers "did I work?" and a Hifz record has to answer "on
   * what?". Empty only for a session whose items could not be resolved.
   */
  readonly pageNumbers: readonly number[];
  readonly recallCount: number;
  readonly successRatio: number;
  readonly completed: boolean;
}

/**
 * Progress over one reporting period (SDS Part 16 "ProgressReportDTO").
 */
export interface ProgressReport {
  readonly period: ReportingPeriod;
  readonly completedSessions: number;
  readonly completedPages: number;
  readonly recallEvents: number;
  readonly progressSummary: string;
}

/**
 * A computed trend over one reporting period
 * (SDS Part 16 "TrendAnalysisDTO").
 */
export interface TrendAnalysis {
  readonly canCompare?: boolean;
  readonly period: ReportingPeriod;
  readonly trendDirection: TrendDirection;
  readonly trendStrength: number;
  readonly summary: string;
}

/**
 * Supplementary dashboard statistics (SDS Part 14 "DASHBOARD CONTRACT").
 * Learning streaks are explicitly conditional in the SDS ("if approved
 * by architecture") and are omitted here until that approval exists.
 */
export interface DashboardStatistics {
  readonly totalPagesMemorized: number;
  readonly reviewDistribution: Readonly<Record<MemoryState, number>>;
}

/**
 * Complete dashboard payload (SDS Part 16 "DashboardDTO"). All values
 * originate exclusively from the Analytics Engine.
 */
export interface DashboardMetrics {
  readonly memoryHealth: MemoryHealth;
  readonly retentionQuality: RetentionQuality;
  readonly todayProgress: ProgressReport;
  readonly weeklyProgress: ProgressReport;
  readonly monthlyProgress: ProgressReport;
  readonly dashboardStatistics: DashboardStatistics;
}

/**
 * Output of `generateHistoricalReport()` (SDS Part 14 "PUBLIC
 * INTERFACE"). The SDS names this operation without enumerating exact
 * fields; this is a conservative, minimal contract to be extended when
 * MODULE 08 is implemented.
 */
export interface HistoricalReport {
  readonly period: ReportingPeriod;
  readonly generatedAt: Date;
  readonly sessions: readonly SessionStatistics[];
}

/**
 * Output of `summarizeLearningProgress()` (SDS Part 14 "PUBLIC
 * INTERFACE"). Intentionally minimal for the same reason as
 * `HistoricalReport` above.
 */
export interface LearningProgressSummary {
  readonly summary: string;
  readonly generatedAt: Date;
}
