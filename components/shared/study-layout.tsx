"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ProgressBar } from "./progress-bar";
import { InfoCard } from "./info-card";
import { Clock } from "lucide-react";

export type StudyStatus = "not_started" | "in_progress" | "paused" | "completed" | "interrupted";

interface StudyLayoutProps {
  header: React.ReactNode;
  controls: React.ReactNode;
  mainContent: React.ReactNode;
  progressCurrent?: number;
  progressTotal?: number;
  progressLabel?: string;
  timerValue?: string;
  timerLabel?: string;
  statusValue?: string;
  statusLabel?: string;
  goalContent?: React.ReactNode;
  summaryContent?: React.ReactNode;
  /** Settings-driven: hides the elapsed-time card when false. */
  showTimer?: boolean;
  /** Settings-driven: hides the progress card when false. */
  showProgress?: boolean;
  className?: string;
}

export function StudyLayout({
  header,
  controls,
  mainContent,
  progressCurrent = 0,
  progressTotal = 1,
  progressLabel = "Progress",
  timerValue,
  timerLabel = "Timer",
  statusValue,
  statusLabel = "Status",
  goalContent,
  summaryContent,
  showTimer = true,
  showProgress = true,
  className,
}: StudyLayoutProps) {
  const isCompleted = summaryContent !== undefined;

  const timerVisible = showTimer && timerValue !== undefined;
  const statusVisible = statusValue !== undefined;
  // With both cards switched off in Settings, the sidebar can end up
  // empty. Dropping the column entirely then lets the main content use
  // the full width instead of leaving a blank third of the screen.
  const sidebarVisible = timerVisible || showProgress || statusVisible || Boolean(goalContent);

  return (
    <div className={cn("space-y-6", className)}>
      {header}
      {controls}
      <Separator />

      {isCompleted ? (
        summaryContent
      ) : (
        <div className={cn("grid gap-6", sidebarVisible && "lg:grid-cols-3")}>
          <div className={cn("space-y-6", sidebarVisible && "lg:col-span-2")}>{mainContent}</div>

          {sidebarVisible && (
            <div className="space-y-4">
              {timerVisible && (
                <InfoCard
                  title={timerLabel}
                  icon={<Clock className="text-muted-foreground h-4 w-4" />}
                >
                  <p className="font-mono text-3xl font-medium tabular-nums">{timerValue}</p>
                </InfoCard>
              )}

              {showProgress && (
                <InfoCard title={progressLabel}>
                  <ProgressBar value={progressCurrent} max={progressTotal} showPercentage={true} />
                </InfoCard>
              )}

              {statusVisible && (
                <InfoCard title={statusLabel}>
                  <p className="text-muted-foreground text-sm capitalize">
                    {statusValue.replace("_", " ")}
                  </p>
                </InfoCard>
              )}

              {goalContent && (
                <InfoCard title="Today's Goal">
                  <div className="text-muted-foreground text-sm">{goalContent}</div>
                </InfoCard>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
