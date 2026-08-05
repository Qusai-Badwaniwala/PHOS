import type { MemorizationLevel, MemorizationOrder, RevisionMode, Settings } from "@/shared/types";

/** Partial update accepted by `updatePersonalization()`. */
export interface PersonalizationUpdate {
  readonly theme?: string;
  readonly ayahRotationFrequency?: number;
}

/**
 * Partial update to display preferences. Every field is optional so a
 * caller changing one switch never overwrites the rest.
 */
export interface PreferencesUpdate {
  readonly dateFormat?: string;
  readonly timeFormat?: string;
  readonly reducedMotion?: boolean;
  readonly compactMode?: boolean;
  readonly sessionShowTimer?: boolean;
  readonly sessionShowProgress?: boolean;
  readonly sessionConfirmCompletion?: boolean;
  readonly revisionShowProgress?: boolean;
}

/**
 * The complete set of answers from the first-run wizard
 * (PRODUCT_REQUIREMENTS Requirement 1). Required rather than partial:
 * onboarding is completed as one act, not accumulated field by field.
 */
export interface OnboardingUpdate {
  readonly memorizationLevel: MemorizationLevel;
  readonly pagesAlreadyMemorized: number;
  readonly dailyAvailableMinutes: number;
  readonly comfortableDailyPages: number;
  readonly followsExistingSchedule: boolean;
  readonly revisionStartsImmediately: boolean;
  readonly memorizationOrder: MemorizationOrder;
}

/**
 * The user's own goal, or `null` to clear it.
 *
 * Set as one act rather than field by field, because a target page
 * count without a date — or a date without a target — is not a goal
 * PHOS could measure anything against.
 */
export interface GoalUpdate {
  readonly targetPages: number;
  readonly targetDate: Date;
}

/**
 * How revision is scheduled (Phase 12), and how long a full traditional
 * pass takes.
 *
 * `cycleLengthDays` is optional so the mode can be switched without
 * restating a length the user already chose.
 */
export interface RevisionModeUpdate {
  readonly revisionMode: RevisionMode;
  readonly cycleLengthDays?: number;
}

/**
 * Persistence contract for the singleton Settings record (SDS Part 9
 * "SETTINGSREPOSITORY"). Exactly one Settings row shall exist at all
 * times; singleton behavior is enforced here, not by the schema
 * (SDS Part 8).
 */
export interface ISettingsRepository {
  /** Returns the singleton Settings row, creating it with default values on first access if it does not yet exist. */
  getSettings(): Promise<Settings>;
  updateAppearance(theme: string): Promise<Settings>;
  updateAyahRotation(frequency: number): Promise<Settings>;
  updatePersonalization(update: PersonalizationUpdate): Promise<Settings>;
  updatePreferences(update: PreferencesUpdate): Promise<Settings>;
  /** Records the wizard's answers and stamps `onboardingCompletedAt`. */
  completeOnboarding(update: OnboardingUpdate): Promise<Settings>;
  updateMemorizationOrder(order: MemorizationOrder): Promise<Settings>;
  /**
   * Sets the user's goal, or clears it when passed `null`.
   *
   * Never called by any engine. A goal is the user's stated intention,
   * and nothing in PHOS may adjust it on their behalf — the Analytics
   * Engine measures against it and says what it finds, which is a
   * different thing entirely.
   */
  updateGoal(goal: GoalUpdate | null): Promise<Settings>;
  /**
   * Switches between PHOS's own scheduling and a fixed traditional
   * cycle (Phase 12).
   *
   * Never called by an engine, for the same reason `updateGoal` is not:
   * this is the user's choice about how they want to work, and the
   * Adaptive Engine reads it rather than sets it.
   */
  updateRevisionMode(update: RevisionModeUpdate): Promise<Settings>;
  /** Begins a fresh traditional pass from the start of the user's order. */
  restartCycle(): Promise<Settings>;
  save(settings: Settings): Promise<Settings>;
  /**
   * Restores preferences to their first-run defaults.
   *
   * Onboarding answers are deliberately preserved — see the
   * implementation for why re-triggering the wizard would exceed what
   * "Reset Settings" promises.
   */
  resetToDefaults(): Promise<Settings>;
}
