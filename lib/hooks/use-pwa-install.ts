"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The `beforeinstallprompt` event, which TypeScript's DOM library does
 * not declare because it is not on the standards track. Chrome, Edge
 * and other Chromium browsers fire it; Safari and Firefox never do.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallAvailability =
  /** Still working out what this browser supports. */
  | "checking"
  /** PHOS is already running as an installed app. */
  | "installed"
  /** The browser offered a real install prompt, which `install()` will show. */
  | "available"
  /** Installation is possible but only through the browser's own menu. */
  | "manual";

export interface PwaInstall {
  availability: InstallAvailability;
  /** Shows the browser's install prompt. Only meaningful when `availability` is `available`. */
  install: () => Promise<void>;
}

/** True when the page is running as an installed app rather than a browser tab. */
function isRunningInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari predates `display-mode` and exposes its own flag.
  return (window.navigator as { standalone?: boolean }).standalone === true;
}

/**
 * Reports whether PHOS can be installed, and installs it.
 *
 * The point of the hook is honesty about what the current browser can
 * actually do. Chromium fires `beforeinstallprompt`, which lets PHOS
 * offer a real one-click button. Safari and Firefox never fire it, so
 * no button is shown and the user gets accurate manual instructions
 * instead — an "Install" button that silently did nothing would be
 * worse than no button.
 *
 * `installed` suppresses the invitation entirely: nothing is more
 * irritating than an installed app asking to be installed.
 */
export function usePwaInstall(): PwaInstall {
  const [availability, setAvailability] = useState<InstallAvailability>("checking");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isRunningInstalled()) {
      setAvailability("installed");
      return;
    }

    // Assume manual until the browser tells us otherwise. The event can
    // fire at any point after load, so this is a floor, not a verdict.
    setAvailability("manual");

    const onBeforeInstallPrompt = (event: Event) => {
      // Chromium shows its own mini-infobar unless this is prevented;
      // PHOS offers installation in context instead, at the end of
      // onboarding, rather than over whatever the user is reading.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setAvailability("available");
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setAvailability("installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // The event is single-use: once shown it cannot be shown again, so
    // the button must not remain offering something that would now do
    // nothing.
    setDeferredPrompt(null);
    setAvailability(outcome === "accepted" ? "installed" : "manual");
  }, [deferredPrompt]);

  return { availability, install };
}
