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
 * Firefox is listed as unsupported rather than omitted. A user who
 * cannot find a menu item everyone else is being told about will assume
 * they are doing it wrong; saying plainly that their browser does not
 * offer it respects their time. PHOS still works perfectly there — it
 * just stays a tab.
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
    platform: "Firefox",
    steps: "Firefox does not offer app installation. PHOS still works normally in a tab.",
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
          "flex gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm",
          className,
        )}
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <p className="text-muted-foreground">
          PHOS is installed and running as an app. Nothing else to do.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-muted/40 p-4", className)}>
      <div className="flex gap-3">
        <MonitorSmartphone
          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium">Install PHOS as an app</p>
            <p className="mt-1 text-sm text-muted-foreground">
              PHOS is best used installed. It opens in its own window — no tabs, no address bar,
              nothing else competing for your attention — starts instantly, and works with no
              internet connection at all. Installing also makes your browser more willing to keep
              your data safe from being cleared automatically.
            </p>
          </div>

          {availability === "available" ? (
            <Button onClick={() => void install()} size="sm">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Install PHOS
            </Button>
          ) : (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                How to install it
              </summary>
              <ul className="mt-3 space-y-2.5">
                {MANUAL_STEPS.map((entry) => (
                  <li key={entry.platform} className="text-sm">
                    <span className="font-medium">{entry.platform}</span>
                    <span className="block text-muted-foreground">{entry.steps}</span>
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
