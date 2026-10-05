"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/lib/hooks/use-pwa-install";
import { CheckCircle2, Download, MonitorSmartphone } from "lucide-react";

interface InstallGuideProps {
  className?: string;
}

/**
 * Per-browser installation steps.
 *
 * Browser installation differs by platform. Mozilla's Android and
 * Windows instructions were verified on 2026-10-05; do not describe
 * Firefox as universally unsupported.
 */
const MANUAL_STEPS: readonly { platform: string; steps: string }[] = [
  {
    platform: "Chrome or Edge, on a computer",
    steps:
      "Click the install icon at the right of the address bar, or open ⋮ → Cast, save and share → Install page as app.",
  },
  {
    platform: "Safari, on a Mac",
    steps: "Choose File → Add to Dock.",
  },
  {
    platform: "iPhone or iPad",
    steps: "Tap the Share button, then Add to Home Screen.",
  },
  {
    platform: "Android",
    steps: "Tap ⋮, then Install app or Add to Home screen.",
  },
  {
    platform: "Firefox on Android",
    steps: "Open the three-dot menu, tap Install, then add PHOS to your home screen.",
  },
  {
    platform: "Firefox on Windows",
    steps:
      "Use the web apps button in the address bar when available. Other Firefox platforms can continue using PHOS in a tab.",
  },
];

/**
 * Invites the user to install PHOS, and shows them how.
 *
 * The claims being made are real ones, not marketing. Installed, PHOS
 * opens in its own window with no tabs, address bar or other sites
 * beside it — which matters more here than in most applications,
 * because PHOS's whole design argument is that it should disappear and
 * leave the user's attention on the Quran. It opens instantly and works
 * with no connection, both of which became literally true in Phase 9
 * when the engines and the database moved into the browser.
 *
 * Installing also makes the data safer, which is worth saying: browsers
 * grant persistent storage more readily to an installed app, and
 * persistent storage is the difference between "kept" and "kept unless
 * the browser needs the space".
 *
 * When the browser supports a real prompt, a single button does it. If
 * not, the manual steps are shown, including for browsers where
 * installing is not possible at all. Nothing here pretends to be
 * available when it is not.
 */
export function InstallGuide({ className }: InstallGuideProps) {
  const { availability, install } = usePwaInstall();

  if (availability === "checking") return null;

  if (availability === "installed") {
    return (
      <div
        className={cn(
          "border-border bg-muted/50 flex gap-3 rounded-lg border p-4 text-sm",
          className,
        )}
      >
        <CheckCircle2 className="text-success mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-muted-foreground">
          PHOS is installed and running as an app. Nothing else to do.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("border-border bg-muted/40 rounded-lg border p-4", className)}>
      <div className="flex gap-3">
        <MonitorSmartphone
          className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium">Install PHOS as an app</p>
            <p className="text-muted-foreground mt-1 text-sm">
              PHOS is best used installed. It opens in its own window — no tabs, no address bar,
              nothing else competing for your attention. Once its offline files have finished
              saving, it works without a connection. Installing can also make your browser more
              willing to retain your record; an exported file is still the copy to keep safe.
            </p>
          </div>

          {availability === "available" ? (
            <Button onClick={() => void install()} size="sm">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Install PHOS
            </Button>
          ) : (
            <details className="group">
              <summary className="text-primary cursor-pointer text-sm font-medium hover:underline">
                How to install it
              </summary>
              <ul className="mt-3 space-y-2.5">
                {MANUAL_STEPS.map((entry) => (
                  <li key={entry.platform} className="text-sm">
                    <span className="font-medium">{entry.platform}</span>
                    <span className="text-muted-foreground block">{entry.steps}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
