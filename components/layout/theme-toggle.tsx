"use client";
import { useTheme } from "@/providers/theme-provider";
import { useSettings } from "@/providers/settings-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
export function ThemeToggle() {
  const { resolvedTheme } = useTheme();
  const { setTheme } = useSettings();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun size={19} strokeWidth={1.6} /> : <Moon size={19} strokeWidth={1.6} />}
    </Button>
  );
}
