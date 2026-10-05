import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SettingsProvider, useSettings } from "@/providers/settings-provider";
import { getSettings, savePreferences } from "@/lib/api/settings";
import { SETTINGS } from "../support/pageFixtures";
import type { AppSettings } from "@/lib/api/settings";
jest.mock("@/client/initialize", () => ({
  initializeRecord: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/api/settings", () => ({
  getSettings: jest.fn(),
  savePreferences: jest.fn(),
  saveTheme: jest.fn(),
}));
const changeTheme = jest.fn();
jest.mock("@/providers/theme-provider", () => ({
  useTheme: () => ({ theme: "system", setTheme: changeTheme }),
}));
function wrapper({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getSettings).mockResolvedValue(SETTINGS);
});
it("serializes preference writes without replacing a newer optimistic choice", async () => {
  let finishFirst!: (value: AppSettings) => void;
  const first = new Promise<AppSettings>((resolve) => {
    finishFirst = resolve;
  });
  jest
    .mocked(savePreferences)
    .mockReturnValueOnce(first)
    .mockResolvedValueOnce({
      ...SETTINGS,
      appearance: { ...SETTINGS.appearance, compactMode: true, reducedMotion: true },
    });
  const { result } = renderHook(() => useSettings(), { wrapper });
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => {
    result.current.updatePreferences({ compactMode: true });
    result.current.updatePreferences({ reducedMotion: true });
  });
  await waitFor(() => expect(savePreferences).toHaveBeenCalledTimes(1));
  expect(result.current.settings.appearance.reducedMotion).toBe(true);
  await act(async () =>
    finishFirst({ ...SETTINGS, appearance: { ...SETTINGS.appearance, compactMode: true } }),
  );
  await waitFor(() => expect(savePreferences).toHaveBeenCalledTimes(2));
  expect(result.current.settings.appearance).toMatchObject({
    compactMode: true,
    reducedMotion: true,
  });
  expect(jest.mocked(savePreferences).mock.calls.map(([patch]) => patch)).toEqual([
    { compactMode: true },
    { reducedMotion: true },
  ]);
});
it("reports a failed write and returns to the saved preference", async () => {
  jest.mocked(savePreferences).mockRejectedValueOnce(new Error("Disk write failed"));
  const { result } = renderHook(() => useSettings(), { wrapper });
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.updatePreferences({ compactMode: true }));
  await waitFor(() => expect(result.current.error).toContain("could not be saved"));
  expect(result.current.settings.appearance.compactMode).toBe(false);
  expect(getSettings).toHaveBeenCalledTimes(2);
});
