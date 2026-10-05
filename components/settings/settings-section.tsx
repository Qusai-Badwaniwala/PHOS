import { cn } from "@/lib/utils";
import React from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * DOM id used as the target of the Settings page's in-page section
   * navigation (`href="#general"` etc.). Without it those anchor links
   * resolved to nothing.
   */
  id?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
  id,
}: SettingsSectionProps) {
  return (
    <section id={id} className={cn("min-w-0", className)}>
      <div className="mb-6">
        <h2 className="font-serif text-2xl">{title}</h2>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}
