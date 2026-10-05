import { cn } from "@/lib/utils";
import React from "react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { ContentCard } from "@/components/shared/content-card";

interface RevisionProgressProps {
  current?: number;
  total?: number;
  label?: string;
  className?: string;
}

export function RevisionProgress({
  current = 0,
  total = 1,
  label = "Progress",
  className,
}: RevisionProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <ContentCard className={cn(className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{label}</h3>
          <span className="text-muted-foreground text-sm tabular-nums">
            {current} / {total}
          </span>
        </div>
        <ProgressBar value={current} max={total} showPercentage={true} />
        <p className="text-muted-foreground text-xs">
          {percentage === 0
            ? "Revision not started."
            : percentage === 100
              ? "Revision complete."
              : `${percentage}% complete.`}
        </p>
      </div>
    </ContentCard>
  );
}
