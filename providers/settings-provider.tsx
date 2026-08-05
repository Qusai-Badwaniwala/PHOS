"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/providers/theme-provider";
import {
  getSettings,
  savePreferences,
  saveTheme,
  type AppSettings,
  type PreferencesPatch,
} from "@/lib/api/settings";
import { setActiveFormats } from "@/lib/format";
import type { Theme } from "@/types/dto";

/** Shown until the first fetch resolves, so nothing renders against invented values. */
const PLACEHOLDER_SETTINGS: AppSettings = {
  general: { language: "en", dateFormat: "mdy", timeFormat: "12h" },
  appearance: { theme: "system", reducedMotion: false, compactMode: false },
  session: { showTimer: true, showProgress: true, confirmCompletion: false },
  revision: { showProgress: true },
  onboarding: {
    completed: true,
    completedAt: null,
    memorizationLevel: "Beginner",
    pagesAlreadyMemorized: 0,
    dailyAvailableMinutes: 30,
    comfortableDailyPages: 1,
    followsExistingSchedule: false,
    revisionStartsImmediately: true,
  },
  memorizationOrder: "Standard",
  // No goal until settings have actually been read. Inventing one here
  // would flash a target the user never set.
  goal: null,
  revisionSchedule: { mode: "Adaptive", cycleLengthDays: 7, cycleStartedAt: null },
};

interface SettingsContextValue {
  settings: AppSettings;
  /** `false` until settings have been read from the server. */
  ready: boolean;
  /** Merges a patch into preferences and persists it. */
  updatePreferences: (patch: PreferencesPatch) => void;
  /** Applies a theme and persists it. */
  setTheme: (theme: Theme) => void;
  /** Re-reads from the server. Used after restore, import, reset and onboarding. */
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

/**
 * Holds the user's settings for the whole application.
 *
 * Why a provider and not a fetch-per-page hook: settings are read on
 * nearly every screen (date formatting, motion, density, session and
 * revision display, and whether onboarding is due), and each one must
 * see the same value the moment it changes.
 *
 * Theme is deliberately not duplicated here. `ThemeProvider` remains
 * its single owner — it is what applies the class before paint — and
 * this provider adds the behaviour it lacks: persisting the choice so
 * it travels with a backup or export.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme: setThemeInProvider } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(PLACEHOLDER_SETTINGS);
  const [ready, setReady] = useState(false);

  /**
   * Publishes the parts of settings that non-React code depends on.
   *
   * The `lib/api/*` adapters format dates outside React, so they read
   * the formats from a module-level cache rather than from context.
   */
  const adopt = useCallback(
    (next: AppSettings) => {
      setSettings(next);
      setActiveFormats({
        dateFormat: next.general.dateFormat === "dmy" ? "dmy" : "mdy",
        timeFormat: next.general.timeFormat === "24h" ? "24h" : "12h",
      });
      setThemeInProvider(next.appearance.theme);
    },
    [setThemeInProvider],
  );

  const reload = useCallback(async () => {
    const fresh = await getSettings();
    adopt(fresh);
    setReady(true);
  }, [adopt]);

  useEffect(() => {
    // A failed load leaves `ready` false, which keeps the Settings page
    // on its skeleton rather than presenting defaults as if they were
    // the user's saved choices.
    void reload().catch(() => undefined);
  }, [reload]);

  // Reflect the two preferences that change how the whole application
  // looks onto the root element, where global CSS can act on them.
  useEffect(() => {
    if (!ready) return;
    const root = window.document.documentElement;
    root.classList.toggle("reduce-motion", settings.appearance.reducedMotion);
    root.classList.toggle("compact", settings.appearance.compactMode);
  }, [ready, settings.appearance.reducedMotion, settings.appearance.compactMode]);

  const updatePreferences = useCallback(
    (patch: PreferencesPatch) => {
      // Applied locally first so the control responds immediately, then
      // reconciled with whatever the server actually stored.
      setSettings((current) => applyPatchLocally(current, patch));
      void savePreferences(patch)
        .then(adopt)
        .catch(() => {
          // The write failed, so the optimistic change was a lie —
          // re-read rather than leave the UI showing an unsaved value.
          void reload().catch(() => undefined);
        });
    },
    [adopt, reload],
  );

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      // Applied immediately so the change is visible without waiting on
      // the network. A failed write costs only portability — the theme
      // is still applied and still cached locally by `ThemeProvider` —
      // so there is nothing useful to interrupt the user with.
      setThemeInProvider(nextTheme);
      setSettings((current) => ({
        ...current,
        appearance: { ...current.appearance, theme: nextTheme },
      }));
      void saveTheme(nextTheme).catch(() => undefined);
    },
    [setThemeInProvider],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      // `theme` comes from ThemeProvider so the value here always
      // matches the class actually on the document.
      settings: { ...settings, appearance: { ...settings.appearance, theme } },
      ready,
      updatePreferences,
      setTheme,
      reload,
    }),
    [settings, theme, ready, updatePreferences, setTheme, reload],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Mirrors the backend's flat preference names onto the nested client shape. */
function applyPatchLocally(current: AppSettings, patch: PreferencesPatch): AppSettings {
  return {
    ...current,
    general: {
      ...current.general,
      ...(patch.dateFormat !== undefined ? { dateFormat: patch.dateFormat } : {}),
      ...(patch.timeFormat !== undefined ? { timeFormat: patch.timeFormat } : {}),
    },
    appearance: {
      ...current.appearance,
      ...(patch.reducedMotion !== undefined ? { reducedMotion: patch.reducedMotion } : {}),
      ...(patch.compactMode !== undefined ? { compactMode: patch.compactMode } : {}),
    },
    session: {
      ...current.session,
      ...(patch.sessionShowTimer !== undefined ? { showTimer: patch.sessionShowTimer } : {}),
      ...(patch.sessionShowProgress !== undefined
        ? { showProgress: patch.sessionShowProgress }
        : {}),
      ...(patch.sessionConfirmCompletion !== undefined
        ? { confirmCompletion: patch.sessionConfirmCompletion }
        : {}),
    },
    revision: {
      ...current.revision,
      ...(patch.revisionShowProgress !== undefined
        ? { showProgress: patch.revisionShowProgress }
        : {}),
    },
  };
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
