"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ExamStageState } from "@/shared/types";
import { Check, Circle, CalendarClock, Lock } from "lucide-react";
import type { ExamStageCardDTO } from "@/types/dto";

interface ExamLadderProps {
  stages: readonly ExamStageCardDTO[];
  /** `null` while an exam is already booked — a second one cannot be. */
  onSchedule: ((stage: ExamStageCardDTO) => void) | null;
  className?: string;
}

const STATE_ICON = {
  [ExamStageState.Passed]: Check,
  [ExamStageState.Scheduled]: CalendarClock,
  [ExamStageState.Available]: Circle,
  [ExamStageState.Locked]: Lock,
} as const;

/**
 * The exam ladder, drawn as a road the user is travelling.
 *
 * WHY A LADDER AND NOT A LIST
 * ---------------------------
 * The stages are genuinely sequential — each carries the earlier
 * material forward — and seeing the whole road is the point: a student
 * on stage two should be able to see that stage eight exists and what
 * it will ask of them. A flat list of eight rows says the same facts
 * and none of the shape.
 *
 * WHY LOCKED STAGES ARE STILL SHOWN
 * ---------------------------------
 * Hiding them would make the ladder shorter as it went, which is
 * exactly backwards. A locked stage shows how many pages remain, so it
 * reads as a distance rather than a door.
 */
export function ExamLadder({ stages, onSchedule, className }: ExamLadderProps) {
  return (
    <ol className={cn("space-y-0", className)} aria-label="Exam roadmap">
      {stages.map((stage, index) => {
        const Icon = STATE_ICON[stage.state];
        const isLast = index === stages.length - 1;
        const reachable = stage.state === ExamStageState.Available && onSchedule !== null;

        return (
          <li key={stage.stage} className="relative flex gap-3 pb-5 last:pb-0">
            {/*
              The connecting line, drawn behind the markers. Stops at the
              final stage so the road ends rather than trailing off.
            */}
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px",
                  stage.state === ExamStageState.Passed ? "bg-primary/40" : "bg-border",
                )}
              />
            )}

            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                stage.state === ExamStageState.Passed &&
                  "border-primary bg-primary text-primary-foreground",
                stage.state === ExamStageState.Scheduled &&
                  "border-primary bg-background text-primary",
                stage.state === ExamStageState.Available && "border-foreground/40 bg-background",
                stage.state === ExamStageState.Locked &&
                  "border-border bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    stage.state === ExamStageState.Locked && "text-muted-foreground",
                  )}
                >
                  {stage.label}
                </p>
                {reachable && (
                  <button
                    type="button"
                    onClick={() => onSchedule(stage)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Schedule
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{stage.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
