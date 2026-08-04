"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { useSettings } from "@/providers/settings-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Laptop } from "lucide-react";

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  // See `ThemeToggle` — read from `ThemeProvider`, write through
  // Settings so the choice is stored in the database and travels with a
  // backup or export, not only in this browser's local storage.
  const { theme } = useTheme();
  const { setTheme } = useSettings();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant={theme === "light" ? "secondary" : "outline"}
        size="sm"
        onClick={() => setTheme("light")}
        className="gap-2"
      >
        <Sun className="h-4 w-4" />
        <span className="hidden sm:inline">Light</span>
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "outline"}
        size="sm"
        onClick={() => setTheme("dark")}
        className="gap-2"
      >
        <Moon className="h-4 w-4" />
        <span className="hidden sm:inline">Dark</span>
      </Button>
      <Button
        variant={theme === "system" ? "secondary" : "outline"}
        size="sm"
        onClick={() => setTheme("system")}
        className="gap-2"
      >
        <Laptop className="h-4 w-4" />
        <span className="hidden sm:inline">System</span>
      </Button>
    </div>
  );
}
