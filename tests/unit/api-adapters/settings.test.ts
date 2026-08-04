import { beforeEach, describe, expect, it, vi } from "vitest";
import { engineSettings } from "../../support/adapterFixtures";

/**
 * `lib/api/settings.ts` flattens the engine's Settings row into the
 * nested shape the settings screens bind to, and answers "how many
 * minutes may today's plan use?" for every other adapter.
 *
 * That second job is the one worth guarding: `getDailyStudyMinutes()`
 * feeds the Adaptive Engine's budget from the Dashboard, the Session
 * page and the Revision page. If it silently returned the wrong number,
 * every plan in the application would be built to the wrong size.
 */
const ops = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updatePreferences: vi.fn(),
  updateTheme: vi.fn(),
  resetSettings: vi.fn(),
  getRoadmap: vi.fn(),
  updateRoadmap: vi.fn(),
}));

vi.mock("@/client/operations", () => ({
  settingsOps: ops,
  backupOps: { DATA_RESET_CONFIRMATION: "DELETE", resetAllData: vi.fn() },
}));

const { getSettings, getDailyStudyMinutes, savePreferences, saveTheme, getRoadmap } =
  await import("@/lib/api/settings");

beforeEach(() => {
  vi.clearAllMocks();
  ops.getSettings.mockResolvedValue(engineSettings());
});

describe("mapping the stored row onto the settings screens", () => {
  it("places every preference where the UI reads it", async () => {
    ops.getSettings.mockResolvedValue(
      engineSettings({
        theme: "dark",
        preferences: {
          dateFormat: "dmy",
          timeFormat: "24h",
          reducedMotion: true,
          compactMode: true,
          sessionShowTimer: false,
          sessionShowProgress: false,
          sessionConfirmCompletion: true,
          revisionShowProgress: false,
        },
      }),
    );

    const settings = await getSettings();

    expect(settings.general).toEqual({ language: "en", dateFormat: "dmy", timeFormat: "24h" });
    expect(settings.appearance).toEqual({
      theme: "dark",
      reducedMotion: true,
      compactMode: true,
    });
    expect(settings.session).toEqual({
      showTimer: false,
      showProgress: false,
      confirmCompletion: true,
    });
    expect(settings.revision).toEqual({ showProgress: false });
  });

  it("carries onboarding and memorization order through untouched", async () => {
    const settings = await getSettings();

    expect(settings.onboarding.completed).toBe(true);
    expect(settings.onboarding.dailyAvailableMinutes).toBe(45);
    expect(settings.memorizationOrder).toBe("Standard");
  });

  it("returns the updated settings after a partial preference change", async () => {
    ops.updatePreferences.mockResolvedValue(
      engineSettings({
        preferences: { ...engineSettings().preferences, compactMode: true },
      }),
    );

    const settings = await savePreferences({ compactMode: true });

    // Only the changed field is sent, so two quick changes cannot
    // clobber one another.
    expect(ops.updatePreferences).toHaveBeenCalledWith({ compactMode: true });
    expect(settings.appearance.compactMode).toBe(true);
  });

  it("persists the theme rather than only applying it", async () => {
    ops.updateTheme.mockResolvedValue(engineSettings({ theme: "dark" }));

    await saveTheme("dark");

    // Stored, so the choice travels with a backup or an export instead
    // of living only in this browser.
    expect(ops.updateTheme).toHaveBeenCalledWith("dark");
  });
});

describe("the daily study budget", () => {
  it("comes from the user's onboarding answer", async () => {
    expect(await getDailyStudyMinutes()).toBe(45);
  });

  it("falls back to an hour rather than throwing when settings cannot be read", async () => {
    // A plan built on a default budget is far better than no plan: the
    // budget only bounds how much of the priority-ordered plan is
    // offered, never which pages or in what order.
    ops.getSettings.mockRejectedValue(new Error("storage unavailable"));

    await expect(getDailyStudyMinutes()).resolves.toBe(60);
  });

  it("falls back when the stored value is zero", async () => {
    // Zero minutes would produce an empty plan every day, which reads
    // as "PHOS has nothing for you" rather than as a bad setting.
    ops.getSettings.mockResolvedValue(
      engineSettings({
        onboarding: { ...engineSettings().onboarding, dailyAvailableMinutes: 0 },
      }),
    );

    expect(await getDailyStudyMinutes()).toBe(60);
  });
});

describe("the roadmap view", () => {
  it("hands the settings UI arrays it is allowed to edit", async () => {
    // The engine's DTO is readonly. Passing it straight through would
    // give the roadmap editor frozen arrays to reorder.
    ops.getRoadmap.mockResolvedValue({
      order: "Custom",
      juzSequence: [30, 1, 2],
      pausedJuz: [5],
      entries: [{ juzNumber: 30, position: 0, paused: false }],
    });

    const roadmap = await getRoadmap();

    expect(roadmap.juzSequence).toEqual([30, 1, 2]);
    expect(roadmap.pausedJuz).toEqual([5]);
    expect(() => roadmap.juzSequence.push(3)).not.toThrow();
    expect(() => roadmap.entries.push({ juzNumber: 1, position: 1, paused: false })).not.toThrow();
  });
});
