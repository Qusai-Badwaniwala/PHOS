import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { Brain } from "lucide-react";

interface MemoryHealthProps {
  score?: number;
  className?: string;
}

export function MemoryHealth({ score, className }: MemoryHealthProps) {
  const hasData = score !== undefined;
  const label =
    score === undefined
      ? "—"
      : score >= 85
        ? "Strong"
        : score >= 65
          ? "Good"
          : score >= 45
            ? "Fair"
            : "Needs attention";

  return (
    <ContentCard className={cn("h-full", className)} as="section">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
          <Brain className="text-primary h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-foreground text-sm font-semibold">Memory Health</h3>
          <p className="text-muted-foreground text-[11px]">Based on recall accuracy</p>
        </div>
      </div>

      <div className="space-y-4">
        {hasData ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-foreground text-3xl font-bold">{score}%</span>
              <span className="text-muted-foreground text-sm">{label}</span>
            </div>
            <ProgressBar
              value={score}
              max={100}
              label="Health Score"
              showPercentage={false}
              size="sm"
            />
            <p className="text-muted-foreground text-xs">
              Based on recall accuracy and review frequency across all memorized pages.
            </p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">Not enough data yet.</p>
            <ProgressBar
              value={0}
              max={100}
              label="Health Score"
              showPercentage={false}
              size="sm"
            />
            <p className="text-muted-foreground text-xs">
              Complete sessions to build your memory profile.
            </p>
          </>
        )}
      </div>
    </ContentCard>
  );
}
