import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";

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
    <ContentCard id={id} className={cn(className)}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-6">{children}</div>
    </ContentCard>
  );
}
