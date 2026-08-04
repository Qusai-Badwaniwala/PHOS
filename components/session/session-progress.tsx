import { cn } from "@/lib/utils";
import React from "react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { ContentCard } from "@/components/shared/content-card";

interface SessionProgressProps {
  current?: number;
  total?: number;
  label?: string;
  className?: string;
}

export function SessionProgress({
  current = 0,
  total = 1,
  label = "Progress",
  className,
}: SessionProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <ContentCard className={cn(className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{label}</h3>
          <span className="text-sm tabular-nums text-muted-foreground">
            {current} / {total}
          </span>
        </div>
        <ProgressBar value={current} max={total} showPercentage={true} />
        <p className="text-xs text-muted-foreground">
          {percentage === 0
            ? "Session not started."
            : percentage === 100
              ? "Session complete."
              : `${percentage}% complete.`}
        </p>
      </div>
    </ContentCard>
  );
}
