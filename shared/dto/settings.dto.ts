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

export interface SettingsDTO {
  readonly theme: string;
  readonly ayahRotationFrequency: number;
  readonly personalization: PersonalizationDTO;
  readonly preferences: PreferencesDTO;
  readonly onboarding: OnboardingDTO;
  readonly memorizationOrder: string;
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
