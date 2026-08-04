import { resolveRoadmap, type MemorizationRoadmap, type RoadmapEntry } from "@/shared/types";
import type { Settings } from "@/shared/types";
import type { RoadmapDTO, SettingsDTO } from "@/shared/dto";

export function toSettingsDTO(settings: Settings): SettingsDTO {
  return {
    theme: settings.theme,
    ayahRotationFrequency: settings.ayahRotationFrequency,
    personalization: {
      theme: settings.theme,
      ayahRotationFrequency: settings.ayahRotationFrequency,
    },
    preferences: {
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      reducedMotion: settings.reducedMotion,
      compactMode: settings.compactMode,
      sessionShowTimer: settings.sessionShowTimer,
      sessionShowProgress: settings.sessionShowProgress,
      sessionConfirmCompletion: settings.sessionConfirmCompletion,
      revisionShowProgress: settings.revisionShowProgress,
    },
    onboarding: {
      // The client only ever needs to know whether to show the wizard,
      // so the null-timestamp check is done here rather than repeated
      // at every call site.
      completed: settings.onboardingCompletedAt !== null,
      completedAt: settings.onboardingCompletedAt
        ? settings.onboardingCompletedAt.toISOString()
        : null,
      memorizationLevel: settings.memorizationLevel,
      pagesAlreadyMemorized: settings.pagesAlreadyMemorized,
      dailyAvailableMinutes: settings.dailyAvailableMinutes,
      comfortableDailyPages: settings.comfortableDailyPages,
      followsExistingSchedule: settings.followsExistingSchedule,
      revisionStartsImmediately: settings.revisionStartsImmediately,
    },
    memorizationOrder: settings.memorizationOrder,
  };
}

/**
 * Presents the roadmap with its resolved sequence alongside the raw
 * entries.
 *
 * Both are sent deliberately: the sequence is what scheduling actually
 * follows, and the entries are what the settings UI edits. Deriving the
 * sequence on the client would duplicate `resolveRoadmap()` and let the
 * two drift.
 */
export function toRoadmapDTO(settings: Settings, entries: readonly RoadmapEntry[]): RoadmapDTO {
  const roadmap: MemorizationRoadmap = resolveRoadmap(settings.memorizationOrder, entries);
  return {
    order: roadmap.order,
    juzSequence: roadmap.juzSequence,
    pausedJuz: roadmap.pausedJuz,
    entries: entries.map((entry) => ({
      juzNumber: entry.juzNumber,
      position: entry.position,
      paused: entry.paused,
    })),
  };
}
