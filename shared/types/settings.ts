import type { MemorizationOrder } from "./roadmap";

/**
 * The user's self-reported starting point, collected during onboarding
 * (PRODUCT_REQUIREMENTS Requirement 1).
 *
 * This is an *estimate used to seed the engine*, never a permanent
 * label. Requirement 3 is explicit: "PHOS must never permanently
 * classify users." Nothing in the engine reads this value once real
 * recall history exists.
 */
export enum MemorizationLevel {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
  Hafiz = "Hafiz",
}

/** Display preferences, moved from browser storage into the database in Phase 4. */
export interface DisplayPreferences {
  readonly dateFormat: string;
  readonly timeFormat: string;
  readonly reducedMotion: boolean;
  readonly compactMode: boolean;
  readonly sessionShowTimer: boolean;
  readonly sessionShowProgress: boolean;
  readonly sessionConfirmCompletion: boolean;
  readonly revisionShowProgress: boolean;
}

/**
 * Answers collected by the first-run wizard (Requirement 1).
 *
 * Kept as a distinct shape so it is obvious at every call site which
 * values are *initial estimates* rather than observed performance.
 */
export interface OnboardingProfile {
  readonly onboardingCompletedAt: Date | null;
  readonly memorizationLevel: MemorizationLevel;
  readonly pagesAlreadyMemorized: number;
  readonly dailyAvailableMinutes: number;
  readonly comfortableDailyPages: number;
  readonly followsExistingSchedule: boolean;
  readonly revisionStartsImmediately: boolean;
}

/**
 * A memorization goal the user set for themselves: reach this many
 * pages by this date.
 *
 * Both fields are `null` together — a goal is either set or it is not,
 * and half a goal is not a state PHOS should be able to reach.
 *
 * Deliberately kept out of `OnboardingProfile`. Onboarding answers are
 * *estimates PHOS may override* as it observes real recall; a goal is
 * the opposite — the user's own stated intention, which PHOS measures
 * itself against and must never quietly adjust.
 */
export interface MemorizationGoal {
  /** How many of the 604 pages the user wants memorized. `null` when no goal is set. */
  readonly goalTargetPages: number | null;
  /** When they want to have reached it. `null` when no goal is set. */
  readonly goalTargetDate: Date | null;
}

/**
 * How PHOS decides what to revise each day (Phase 12).
 *
 * Two genuinely different answers to the same question, and neither is
 * wrong.
 */
export enum RevisionMode {
  /**
   * Spaced repetition: revise what is closest to being forgotten.
   *
   * PHOS's own scheduling, and the default. Fewer pages for the same
   * retention, because effort follows need.
   */
  Adaptive = "Adaptive",
  /**
   * A fixed rotation through everything memorized, in order, on a
   * repeating cycle — the Manzil pattern taught in most Hifz
   * institutions.
   *
   * Chosen by people whose teacher sets a cycle, or who simply find a
   * predictable daily portion easier to keep to than a list that
   * changes shape every morning. Requirement 9 settles the argument
   * about which is better: PHOS recommends, the user decides.
   */
  Traditional = "Traditional",
}

/**
 * The traditional cycle's own settings.
 *
 * Only meaningful when `revisionMode` is `Traditional`, but stored
 * unconditionally so switching back and forth does not lose the
 * length the user chose.
 */
export interface TraditionalCycle {
  /** Days to complete one full pass over everything memorized. */
  readonly cycleLengthDays: number;
  /**
   * When the current pass began.
   *
   * Stored rather than derived, because "where am I in the cycle" must
   * survive a day the user did not open PHOS. Deriving it from the last
   * session would silently restart the rotation after every break.
   */
  readonly cycleStartedAt: Date | null;
}

/**
 * Domain-safe representation of the singleton Settings record.
 *
 * Mirrors the `Settings` Prisma model (SDS Part 8). Exactly one
 * Settings record shall exist; singleton behavior is enforced by the
 * SettingsRepository, not by this type.
 */
export interface Settings
  extends DisplayPreferences, OnboardingProfile, MemorizationGoal, TraditionalCycle {
  readonly id: string;
  readonly theme: string;
  readonly ayahRotationFrequency: number;
  readonly memorizationOrder: MemorizationOrder;
  readonly revisionMode: RevisionMode;
  /**
   * When the one-time repair of interleaved seeded revision ran, or
   * `null` if it has not.
   *
   * Not a preference — a record that a migration happened. It lives on
   * Settings only because that is where PHOS keeps its single row.
   */
  readonly revisionBlocksRepairedAt: Date | null;
  /** When the invented first-studied dates were cleared. Same kind of record as above. */
  readonly estimatedDatesRepairedAt: Date | null;
  /** When the user last exported to a file. `null` means never. */
  readonly lastExportedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
