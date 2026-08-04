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
 * Domain-safe representation of the singleton Settings record.
 *
 * Mirrors the `Settings` Prisma model (SDS Part 8). Exactly one
 * Settings record shall exist; singleton behavior is enforced by the
 * SettingsRepository, not by this type.
 */
export interface Settings extends DisplayPreferences, OnboardingProfile {
  readonly id: string;
  readonly theme: string;
  readonly ayahRotationFrequency: number;
  readonly memorizationOrder: MemorizationOrder;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
