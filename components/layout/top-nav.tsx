"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Menu } from "lucide-react";

/* Map route segments to human-readable titles */
const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Overview of your Hifz journey" },
  session: { title: "Memorization", subtitle: "New memorization — Sabaq" },
  revision: { title: "Revision", subtitle: "Review and strengthen your memory" },
  analytics: { title: "Analytics", subtitle: "Understand your patterns" },
  history: { title: "History", subtitle: "Past sessions and activity" },
  backup: { title: "Backup & Restore", subtitle: "Your data, your control" },
  settings: { title: "Settings", subtitle: "Customize PHOS" },
  about: { title: "About", subtitle: "About PHOS" },
};

interface TopNavProps {
  onMenuToggle: () => void;
}

export function TopNav({ onMenuToggle }: TopNavProps) {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] || "dashboard";
  const page = pageTitles[segment] ?? { title: segment.charAt(0).toUpperCase() + segment.slice(1) };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4",
        /*
          A material the page scrolls under, rather than an opaque strip
          with a rule beneath it.

          The hard `border-b` was a line drawn whether or not anything
          was behind it. `.scroll-edge` replaces it with a short fade
          that only reads where content actually passes underneath, so
          the chrome separates itself by depth instead of by a divider —
          and the page feels continuous under it rather than clipped.

          `material-chrome` is the hook that turns all of this solid for
          anyone who has asked their system to reduce transparency.
        */
        "material-chrome scroll-edge bg-background/70 backdrop-blur-xl backdrop-saturate-150",
        "px-4 md:px-6 lg:px-8",
      )}
      role="banner"
    >
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
        aria-expanded={false}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* Page title + subtitle */}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-base font-semibold leading-tight text-foreground">
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="hidden truncate text-[11px] leading-tight text-muted-foreground sm:block">
            {page.subtitle}
          </p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
