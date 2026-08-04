import { MemorizationLevel, MemorizationOrder, type Settings } from "@/shared/types";
import type {
  ISettingsRepository,
  OnboardingUpdate,
  PersonalizationUpdate,
  PreferencesUpdate,
} from "../interfaces/ISettingsRepository";
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

  async resetToDefaults(): Promise<Settings> {
    // Display preferences only. Onboarding answers and
    // `memorizationOrder` are deliberately preserved — see the SQL
    // repository for why re-triggering the wizard, or silently moving a
    // Juz-30-first user back to Standard, exceeds what "Reset Settings"
    // promises.
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
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}
