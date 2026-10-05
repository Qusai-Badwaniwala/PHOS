import { cn } from "@/lib/utils";
import React from "react";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  /** Visual size variant */
  size?: "sm" | "md";
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = "md",
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const roundedPct = Math.round(percentage);

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-muted-foreground text-xs font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
              {roundedPct}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "bg-secondary w-full overflow-hidden rounded-full",
          size === "sm" ? "h-1.5" : "h-2",
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ? `${label}: ${roundedPct}%` : `Progress: ${roundedPct}%`}
      >
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
