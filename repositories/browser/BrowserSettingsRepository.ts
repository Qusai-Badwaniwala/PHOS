import { MemorizationLevel, MemorizationOrder, RevisionMode, type Settings } from "@/shared/types";
import type {
  GoalUpdate,
  ISettingsRepository,
  RevisionModeUpdate,
  OnboardingUpdate,
  PersonalizationUpdate,
  PreferencesUpdate,
} from "../interfaces/ISettingsRepository";
import { DEFAULT_CYCLE_LENGTH_DAYS } from "@/shared/constants";
import { generateId, getDatabase, type StoredSettings } from "./database";

/**
 * First-run defaults, matching `seedIfEmpty()` in `database.ts` and the
 * column defaults in `schema.prisma`. Keeping one set of constants is
 * what guarantees "reset" and "first run" cannot drift apart.
 */
const DEFAULTS = {
  theme: "system",
  ayahRotationFrequency: 1,
  dateFormat: "mdy",
  timeFormat: "12h",
  reducedMotion: false,
  compactMode: false,
  sessionShowTimer: true,
  sessionShowProgress: true,
  sessionConfirmCompletion: false,
  revisionShowProgress: true,
} as const;

/**
 * IndexedDB implementation of `ISettingsRepository`.
 *
 * Enforces the same singleton invariant as the SQL version: exactly one
 * Settings row, created lazily on first read so no caller has to care
 * whether seeding has run.
 */
export class BrowserSettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<Settings> {
    const db = await getDatabase();
    const existing = await db.getAll("settings");
    if (existing[0]) return toDomainSettings(existing[0]);

    const now = new Date().toISOString();
    const created: StoredSettings = {
      id: generateId(),
      ...DEFAULTS,
      onboardingCompletedAt: null,
      memorizationLevel: MemorizationLevel.Beginner,
      pagesAlreadyMemorized: 0,
      dailyAvailableMinutes: 30,
      comfortableDailyPages: 1,
      followsExistingSchedule: false,
      revisionStartsImmediately: true,
      memorizationOrder: MemorizationOrder.Standard,
      createdAt: now,
      updatedAt: now,
    };
    await db.add("settings", created);
    return toDomainSettings(created);
  }

  async updateAppearance(theme: string): Promise<Settings> {
    return this.applyUpdate({ theme });
  }

  async updateAyahRotation(frequency: number): Promise<Settings> {
    return this.applyUpdate({ ayahRotationFrequency: frequency });
  }

  async updatePersonalization(update: PersonalizationUpdate): Promise<Settings> {
    return this.applyUpdate({
      ...(update.theme !== undefined ? { theme: update.theme } : {}),
      ...(update.ayahRotationFrequency !== undefined
        ? { ayahRotationFrequency: update.ayahRotationFrequency }
        : {}),
    });
  }

  async updatePreferences(update: PreferencesUpdate): Promise<Settings> {
    // Only fields actually present are copied, so a caller changing one
    // switch can never blank the others.
    const patch: Partial<StoredSettings> = {};
    if (update.dateFormat !== undefined) patch.dateFormat = update.dateFormat;
    if (update.timeFormat !== undefined) patch.timeFormat = update.timeFormat;
    if (update.reducedMotion !== undefined) patch.reducedMotion = update.reducedMotion;
    if (update.compactMode !== undefined) patch.compactMode = update.compactMode;
    if (update.sessionShowTimer !== undefined) patch.sessionShowTimer = update.sessionShowTimer;
    if (update.sessionShowProgress !== undefined) {
      patch.sessionShowProgress = update.sessionShowProgress;
    }
    if (update.sessionConfirmCompletion !== undefined) {
      patch.sessionConfirmCompletion = update.sessionConfirmCompletion;
    }
    if (update.revisionShowProgress !== undefined) {
      patch.revisionShowProgress = update.revisionShowProgress;
    }
    return this.applyUpdate(patch);
  }

  async completeOnboarding(update: OnboardingUpdate): Promise<Settings> {
    return this.applyUpdate({
      memorizationLevel: update.memorizationLevel,
      pagesAlreadyMemorized: update.pagesAlreadyMemorized,
      dailyAvailableMinutes: update.dailyAvailableMinutes,
      comfortableDailyPages: update.comfortableDailyPages,
      followsExistingSchedule: update.followsExistingSchedule,
      revisionStartsImmediately: update.revisionStartsImmediately,
      memorizationOrder: update.memorizationOrder,
      onboardingCompletedAt: new Date().toISOString(),
    });
  }

  async updateMemorizationOrder(order: MemorizationOrder): Promise<Settings> {
    return this.applyUpdate({ memorizationOrder: order });
  }

  async updateGoal(goal: GoalUpdate | null): Promise<Settings> {
    // Both fields move together, so clearing cannot leave a date behind
    // with no target — a state nothing downstream knows how to read.
    return this.applyUpdate(
      goal
        ? {
            goalTargetPages: goal.targetPages,
            goalTargetDate: goal.targetDate.toISOString(),
          }
        : { goalTargetPages: null, goalTargetDate: null },
    );
  }

  /**
   * Switches how revision is scheduled, and how long a full pass takes.
   *
   * `cycleStartedAt` is stamped only when there is no start date at
   * all — the first time this user ever chooses a cycle. A cycle with
   * no start has no position, so it needs one; a cycle that already has
   * one keeps it.
   *
   * That includes coming *back*. Somebody who tries spaced repetition
   * for a week and returns to their cycle should land where the
   * rotation actually is, not at the beginning of the Mushaf. Stamping
   * on every switch to `Traditional` looks equivalent and is not: it
   * silently restarts their teacher's rotation every time they look at
   * the other option. `restartCycle()` is the explicit way to begin
   * again, and it is the only way.
   */
  async updateRevisionMode(update: RevisionModeUpdate): Promise<Settings> {
    const current = await this.getSettings();
    const startingCycle =
      update.revisionMode === RevisionMode.Traditional && current.cycleStartedAt === null;

    return this.applyUpdate({
      revisionMode: update.revisionMode,
      ...(update.cycleLengthDays !== undefined ? { cycleLengthDays: update.cycleLengthDays } : {}),
      ...(startingCycle ? { cycleStartedAt: new Date().toISOString() } : {}),
    });
  }

  async markRevisionBlocksRepaired(): Promise<Settings> {
    return this.applyUpdate({ revisionBlocksRepairedAt: new Date().toISOString() });
  }

  async markEstimatedDatesRepaired(): Promise<Settings> {
    return this.applyUpdate({ estimatedDatesRepairedAt: new Date().toISOString() });
  }

  async markDataExported(): Promise<Settings> {
    return this.applyUpdate({ lastExportedAt: new Date().toISOString() });
  }

  /** Begins a fresh pass from the start of the user's order. */
  async restartCycle(): Promise<Settings> {
    return this.applyUpdate({ cycleStartedAt: new Date().toISOString() });
  }

  async resetToDefaults(): Promise<Settings> {
    // Display preferences only. Onboarding answers, `memorizationOrder`,
    // the user's goal and their revision mode are deliberately
    // preserved — re-triggering the wizard, silently moving a
    // Juz-30-first user back to Standard, deleting a goal they set, or
    // switching somebody off the cycle their teacher set all exceed
    // what "Reset Settings" promises. `DEFAULTS` holds none of those
    // keys, so this cannot touch them even by accident.
    return this.applyUpdate({ ...DEFAULTS });
  }

  async save(settings: Settings): Promise<Settings> {
    return this.applyUpdate({
      theme: settings.theme,
      ayahRotationFrequency: settings.ayahRotationFrequency,
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      reducedMotion: settings.reducedMotion,
      compactMode: settings.compactMode,
      sessionShowTimer: settings.sessionShowTimer,
      sessionShowProgress: settings.sessionShowProgress,
      sessionConfirmCompletion: settings.sessionConfirmCompletion,
      revisionShowProgress: settings.revisionShowProgress,
      memorizationOrder: settings.memorizationOrder,
      goalTargetPages: settings.goalTargetPages,
      goalTargetDate: settings.goalTargetDate ? settings.goalTargetDate.toISOString() : null,
      revisionMode: settings.revisionMode,
      cycleLengthDays: settings.cycleLengthDays,
      cycleStartedAt: settings.cycleStartedAt ? settings.cycleStartedAt.toISOString() : null,
    });
  }

  private async applyUpdate(patch: Partial<StoredSettings>): Promise<Settings> {
    // Guarantees the singleton exists before writing to it.
    const current = await this.getSettings();

    const db = await getDatabase();
    const tx = db.transaction("settings", "readwrite");
    const record = await tx.store.get(current.id);

    if (!record) {
      await tx.done;
      throw new Error("Settings row disappeared while updating it.");
    }

    const updated: StoredSettings = {
      ...record,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await tx.store.put(updated);
    await tx.done;

    return toDomainSettings(updated);
  }
}

function toDomainSettings(record: StoredSettings): Settings {
  return {
    id: record.id,
    theme: record.theme,
    ayahRotationFrequency: record.ayahRotationFrequency,
    dateFormat: record.dateFormat,
    timeFormat: record.timeFormat,
    reducedMotion: record.reducedMotion,
    compactMode: record.compactMode,
    sessionShowTimer: record.sessionShowTimer,
    sessionShowProgress: record.sessionShowProgress,
    sessionConfirmCompletion: record.sessionConfirmCompletion,
    revisionShowProgress: record.revisionShowProgress,
    onboardingCompletedAt: record.onboardingCompletedAt
      ? new Date(record.onboardingCompletedAt)
      : null,
    memorizationLevel: record.memorizationLevel as MemorizationLevel,
    pagesAlreadyMemorized: record.pagesAlreadyMemorized,
    dailyAvailableMinutes: record.dailyAvailableMinutes,
    comfortableDailyPages: record.comfortableDailyPages,
    followsExistingSchedule: record.followsExistingSchedule,
    revisionStartsImmediately: record.revisionStartsImmediately,
    memorizationOrder: record.memorizationOrder as MemorizationOrder,
    /*
     * Records written before Phase 10 have no goal keys at all. `??`
     * rather than a cast, so an upgrading user reads "no goal set"
     * instead of `undefined` leaking into the projection arithmetic and
     * producing a date in 1970.
     *
     * Both fields resolve together: a goal is set or it is not.
     */
    goalTargetPages: record.goalTargetPages ?? null,
    goalTargetDate: record.goalTargetDate ? new Date(record.goalTargetDate) : null,
    /*
     * Same discipline for Phase 12. A record written before the
     * traditional cycle existed has none of these keys, and must read
     * as `Adaptive` — which is exactly the behaviour that user already
     * had. Defaulting to `Traditional` would silently rewrite how PHOS
     * schedules for everybody who upgraded.
     */
    revisionMode: (record.revisionMode as RevisionMode) ?? RevisionMode.Adaptive,
    cycleLengthDays: record.cycleLengthDays ?? DEFAULT_CYCLE_LENGTH_DAYS,
    cycleStartedAt: record.cycleStartedAt ? new Date(record.cycleStartedAt) : null,
    revisionBlocksRepairedAt: record.revisionBlocksRepairedAt
      ? new Date(record.revisionBlocksRepairedAt)
      : null,
    // Absent means the repair has not run for this user — correct for
    // every row written before it existed.
    estimatedDatesRepairedAt: record.estimatedDatesRepairedAt
      ? new Date(record.estimatedDatesRepairedAt)
      : null,
    // Absent means the user has never exported. That is the state the
    // Backup screen exists to warn about, so it must not silently
    // become "unknown".
    lastExportedAt: record.lastExportedAt ? new Date(record.lastExportedAt) : null,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}
