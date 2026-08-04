import { cn } from "@/lib/utils";
import React from "react";
import { Separator } from "@/components/ui/separator";

interface SettingsItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showSeparator?: boolean;
}

export function SettingsItem({
  label,
  description,
  children,
  className,
  showSeparator = true,
}: SettingsItemProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <label className="text-sm font-medium">{label}</label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
      {showSeparator && <Separator />}
    </div>
  );
}
