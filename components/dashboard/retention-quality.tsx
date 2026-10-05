import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { ShieldCheck } from "lucide-react";

interface RetentionQualityProps {
  score?: number;
  className?: string;
}

export function RetentionQuality({ score, className }: RetentionQualityProps) {
  const hasData = score !== undefined;

  return (
    <ContentCard className={cn("h-full", className)}>
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="text-muted-foreground h-5 w-5" aria-hidden="true" />
        <h3 className="font-semibold">Retention Quality</h3>
      </div>

      {hasData ? (
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{score}%</span>
            <span className="text-muted-foreground text-sm">retained</span>
          </div>
          <ProgressBar value={score} max={100} label="Retention Score" showPercentage={false} />
          <p className="text-muted-foreground text-xs">
            Long-term retention based on successful recalls over time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Not enough data yet.</p>
          <ProgressBar value={0} max={100} label="Retention Score" showPercentage={false} />
          <p className="text-muted-foreground text-xs">
            Regular revision strengthens retention tracking.
          </p>
        </div>
      )}
    </ContentCard>
  );
}
