"use client";

import React from "react";
import { useTheme } from "@/providers/theme-provider";
import { useSettings } from "@/providers/settings-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Laptop } from "lucide-react";

export function ThemeToggle() {
  // Read the current theme from the provider that owns it, but change
  // it through Settings, which additionally persists the choice to the
  // database so it survives an export/restore.
  const { theme } = useTheme();
  const { setTheme } = useSettings();

  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <Button
        variant={theme === "light" ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme("light")}
        aria-label="Switch to light theme"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme("dark")}
        aria-label="Switch to dark theme"
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === "system" ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme("system")}
        aria-label="Switch to system theme"
      >
        <Laptop className="h-4 w-4" />
      </Button>
    </div>
  );
}
