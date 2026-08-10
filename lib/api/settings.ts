import { backupOps, settingsOps } from "@/client/operations";
import type {
  OnboardingDTO,
  PreferencesDTO,
  RoadmapDTO,
  SettingsDTO as EngineSettings,
} from "@/shared/dto";
import type { SettingsDTO, Theme } from "@/types/dto";

/**
 * The engine-side Settings shapes (`shared/dto/settings.dto.ts`).
 *
 * As of Phase 4 every preference is stored in the database rather than
 * in browser storage, so it travels with a backup and an export. The
 * one exception is the theme class applied before paint, which
 * `ThemeProvider` caches in `localStorage` purely to avoid a flash.
 *
 * These aliases keep the names the rest of the frontend already uses,
 * so nothing outside this module had to change when PHOS stopped
 * having a backend.
 */
type BackendPreferences = PreferencesDTO;
export type BackendOnboarding = OnboardingDTO;
type BackendSettings = EngineSettings;

/** Settings plus the onboarding state the client needs to decide whether to run the wizard. */
export interface AppSettings extends SettingsDTO {
  onboarding: BackendOnboarding;
  memorizationOrder: string;
  /** The user's goal, or `null` when they have not set one. */
  goal: { targetPages: number; targetDate: string } | null;
  /**
   * How revision is *scheduled* (Phase 12).
   *
   * Named apart from `revision`, which is the display preference for
   * the revision screen. Two unrelated things called "revision" on one
   * object is exactly how a wrong field gets read.
   */
  revisionSchedule: { mode: string; cycleLengthDays: number; cycleStartedAt: string | null };
}

function toAppSettings(backend: BackendSettings): AppSettings {
  const p = backend.preferences;
  return {
    general: { language: "en", dateFormat: p.dateFormat, timeFormat: p.timeFormat },
    appearance: {
      theme: (backend.theme as Theme) ?? "system",
      reducedMotion: p.reducedMotion,
      compactMode: p.compactMode,
    },
    session: {
      showTimer: p.sessionShowTimer,
      showProgress: p.sessionShowProgress,
      confirmCompletion: p.sessionConfirmCompletion,
    },
    revision: { showProgress: p.revisionShowProgress },
    onboarding: backend.onboarding,
    memorizationOrder: backend.memorizationOrder,
    goal: backend.goal,
    revisionSchedule: backend.revision,
  };
}

export async function getSettings(): Promise<AppSettings> {
  return toAppSettings(await settingsOps.getSettings());
}

/**
 * Sets the user's goal, or clears it when passed `null`.
 *
 * Nothing in PHOS calls this except the user's own action in Settings.
 * A goal is their stated intention; no engine may set, move or delete
 * one on their behalf.
 */
/**
 * Switches between PHOS's own scheduling and a fixed traditional cycle,
 * and sets how long a full pass takes.
 */
export async function saveRevisionMode(input: {
  mode: string;
  cycleLengthDays?: number;
}): Promise<AppSettings> {
  return toAppSettings(await settingsOps.updateRevisionMode(input));
}

/** Begins the rotation again from the start of the user's order. */
export async function restartRevisionCycle(): Promise<AppSettings> {
  return toAppSettings(await settingsOps.restartRevisionCycle());
}

/** Where the fixed rotation has reached, or `null` on PHOS's own scheduling. */
export async function getRevisionCycle() {
  return settingsOps.getRevisionCycle();
}

export async function saveGoal(
  goal: { targetPages: number; targetDate: string } | null,
): Promise<AppSettings> {
  return toAppSettings(await settingsOps.updateGoal(goal));
}

/** Fallback study budget if settings cannot be read — the previous hardcoded value. */
const FALLBACK_STUDY_MINUTES = 60;

/**
 * The daily study budget the Adaptive Engine should plan within,
 * taken from the user's onboarding answer
 * (PRODUCT_REQUIREMENTS Requirement 1: "Daily workload is initialized
 * using onboarding").
 *
 * Falls back rather than throws: a plan built with a default budget is
 * far better than no plan at all, and the budget only bounds how much
 * of the priority-ordered plan is offered, never which pages or in what
 * order.
 */
export async function getDailyStudyMinutes(): Promise<number> {
  try {
    const settings = await getSettings();
    return settings.onboarding.dailyAvailableMinutes || FALLBACK_STUDY_MINUTES;
  } catch {
    return FALLBACK_STUDY_MINUTES;
  }
}

/** A partial preferences update, in the stored flat field names. */
export type PreferencesPatch = Partial<BackendPreferences>;

/**
 * Persists a partial preferences change.
 *
 * Applying only the changed fields — rather than the whole object —
 * means two quick successive changes cannot overwrite one another.
 */
export async function savePreferences(patch: PreferencesPatch): Promise<AppSettings> {
  return toAppSettings(await settingsOps.updatePreferences({ ...patch }));
}

/** Persists `theme` so it travels with backups and exports. */
export async function saveTheme(theme: Theme): Promise<void> {
  await settingsOps.updateTheme(theme);
}

/**
 * Restores every preference to its first-run default.
 *
 * Onboarding answers survive: see `SettingsRepository.resetToDefaults()`
 * for why re-triggering the wizard would exceed what this label
 * promises.
 */
export async function resetSettings(): Promise<AppSettings> {
  return toAppSettings(await settingsOps.resetSettings());
}

// ---------------------------------------------------------------
// Onboarding (PRODUCT_REQUIREMENTS Requirement 1)
// ---------------------------------------------------------------

export interface OnboardingAnswers {
  memorizationOrder: string;
  /**
   * Complete Juz memorized, along `memorizationOrder` — not Juz
   * numbers. Three means the first three Juz of the user's own order.
   */
  juzAlreadyMemorized: number;
  /** Pages into the Juz after those, for anyone who did not stop on a boundary. */
  extraPagesMemorized: number;
  dailyAvailableMinutes: number;
  comfortableDailyPages: number;
  followsExistingSchedule: boolean;
  revisionStartsImmediately: boolean;
  /**
   * Ladder stages the user says they already passed, before PHOS.
   *
   * Recorded as history only — a stage still unlocks on memorization
   * alone, so this never grants access to anything.
   */
  passedExamStages: number[];
}

export type { OnboardingPreview } from "@/client/operations/settings";
export type { GoalMilestone, GoalPosition } from "@/client/operations/settings";

/**
 * The Juz the user could aim for, in their own memorization order, and
 * where they currently stand.
 *
 * Lets the Goal settings offer "through Juz 5" while still storing the
 * page count the projection needs.
 */
export async function getGoalPosition(): Promise<settingsOps.GoalPosition> {
  return settingsOps.getGoalPosition();
}

/**
 * What the onboarding answers will do, without saving them.
 *
 * Backed by the same sequence the real seeding uses, so what the user
 * is shown here is exactly what they will get.
 */
export async function previewOnboarding(
  order: string,
  juzCount: number,
  extraPages: number,
): Promise<settingsOps.OnboardingPreview> {
  return settingsOps.previewOnboarding(order, juzCount, extraPages);
}

export interface OnboardingResult extends AppSettings {
  /** How many pages were marked as already memorized, along the chosen roadmap. */
  seededPages: number;
}

export async function completeOnboarding(answers: OnboardingAnswers): Promise<OnboardingResult> {
  const response = await settingsOps.completeOnboarding({ ...answers });
  return { ...toAppSettings(response), seededPages: response.seededPages };
}

// ---------------------------------------------------------------
// Roadmap (PRODUCT_REQUIREMENTS Requirement 2)
// ---------------------------------------------------------------

export interface RoadmapEntryView {
  juzNumber: number;
  position: number;
  paused: boolean;
}

export interface RoadmapView {
  order: string;
  juzSequence: number[];
  pausedJuz: number[];
  entries: RoadmapEntryView[];
}

function toRoadmapView(roadmap: RoadmapDTO): RoadmapView {
  return {
    order: roadmap.order,
    juzSequence: [...roadmap.juzSequence],
    pausedJuz: [...roadmap.pausedJuz],
    entries: roadmap.entries.map((entry) => ({ ...entry })),
  };
}

export async function getRoadmap(): Promise<RoadmapView> {
  return toRoadmapView(await settingsOps.getRoadmap());
}

/** Updates the roadmap. Never touches memorization progress — only future scheduling. */
export async function updateRoadmap(update: {
  order?: string;
  juzSequence?: number[];
  juzNumber?: number;
  paused?: boolean;
}): Promise<RoadmapView> {
  return toRoadmapView(await settingsOps.updateRoadmap(update));
}

// ---------------------------------------------------------------
// Danger Zone
// ---------------------------------------------------------------

export type { DataResetSummary } from "@/client/operations/backup";

/** The exact phrase the user must type to confirm deletion. Checked again inside the operation. */
export const DATA_RESET_CONFIRMATION = backupOps.DATA_RESET_CONFIRMATION;

/**
 * Permanently deletes all memorization data. A verified backup is taken
 * first and its id returned, so the action is recoverable even though
 * it is presented as final.
 */
export async function resetAllData(): Promise<backupOps.DataResetSummary> {
  return backupOps.resetAllData(DATA_RESET_CONFIRMATION);
}
