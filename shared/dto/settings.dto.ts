/**
 * `personalization` is not backed by a separate database field — it is
 * a convenience nested view of `theme` and `ayahRotationFrequency`,
 * documented rather than silently invented as new stored data.
 */
export interface PersonalizationDTO {
  readonly theme: string;
  readonly ayahRotationFrequency: number;
}

/** Display preferences (Phase 4: moved from browser storage into the database). */
export interface PreferencesDTO {
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
 * The user's onboarding answers (PRODUCT_REQUIREMENTS Requirement 1).
 *
 * `completed` is derived from `onboardingCompletedAt` so the client
 * never has to interpret a null timestamp to answer the only question
 * it actually asks: "should the wizard be shown?"
 */
export interface OnboardingDTO {
  readonly completed: boolean;
  readonly completedAt: string | null;
  readonly memorizationLevel: string;
  readonly pagesAlreadyMemorized: number;
  readonly dailyAvailableMinutes: number;
  readonly comfortableDailyPages: number;
  readonly followsExistingSchedule: boolean;
  readonly revisionStartsImmediately: boolean;
}

/**
 * The user's own goal (Phase 10), or `null` when none is set.
 *
 * Separate from `OnboardingDTO` on purpose: onboarding answers are
 * estimates PHOS overrides as it observes real recall, while a goal is
 * the user's stated intention and is never adjusted on their behalf.
 */
export interface GoalDTO {
  readonly targetPages: number;
  readonly targetDate: string;
}

/**
 * How revision is scheduled (Phase 12).
 *
 * `cycleStartedAt` travels with the mode because "day 3 of 7" is
 * meaningless without it, and recomputing the position anywhere but the
 * engine would be a second implementation of the same arithmetic.
 */
export interface RevisionScheduleDTO {
  readonly mode: string;
  readonly cycleLengthDays: number;
  readonly cycleStartedAt: string | null;
}

export interface SettingsDTO {
  readonly theme: string;
  readonly ayahRotationFrequency: number;
  readonly personalization: PersonalizationDTO;
  readonly preferences: PreferencesDTO;
  readonly onboarding: OnboardingDTO;
  readonly memorizationOrder: string;
  readonly goal: GoalDTO | null;
  readonly revision: RevisionScheduleDTO;
}

export interface UpdateSettingsRequestDTO {
  readonly theme?: string;
  readonly ayahRotationFrequency?: number;
  readonly personalization?: Partial<PersonalizationDTO>;
}

/** One Juz's place in the roadmap (PRODUCT_REQUIREMENTS Requirement 2). */
export interface RoadmapEntryDTO {
  readonly juzNumber: number;
  readonly position: number;
  readonly paused: boolean;
}

export interface RoadmapDTO {
  readonly order: string;
  /** Juz numbers in memorization order, with paused Juz already removed. */
  readonly juzSequence: readonly number[];
  readonly pausedJuz: readonly number[];
  readonly entries: readonly RoadmapEntryDTO[];
}
