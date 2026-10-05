import { cn } from "@/lib/utils";
import React from "react";

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
  const id = React.useId();
  const control =
    React.isValidElement(children) && typeof children.type !== "string"
      ? React.cloneElement(children as React.ReactElement<React.AriaAttributes>, {
          "aria-labelledby": id,
        })
      : children;
  return (
    <div className={cn("py-4", showSeparator && "border-b", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p id={id} className="text-base font-medium">
            {label}
          </p>
          {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
        </div>
        <div className="max-w-full shrink-0">{control}</div>
      </div>
    </div>
  );
}
