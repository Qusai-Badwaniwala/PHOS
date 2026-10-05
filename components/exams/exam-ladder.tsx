"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { ExamStageState } from "@/shared/types";
import { Check, ArrowRight, Lock } from "lucide-react";
import type { ExamStageCardDTO } from "@/types/dto";
export function ExamLadder({
  stages,
  onSchedule,
  className,
}: {
  stages: readonly ExamStageCardDTO[];
  onSchedule: ((stage: ExamStageCardDTO) => void) | null;
  className?: string;
}) {
  return (
    <ol className={cn("divide-y border-y", className)} aria-label="Exam roadmap">
      {stages.map((stage) => {
        const available = stage.state === ExamStageState.Available && onSchedule !== null;
        const content = (
          <>
            <span className="text-muted-foreground w-7 shrink-0 text-sm tabular-nums">
              {String(stage.stage).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{stage.label}</span>
              <span className="text-muted-foreground mt-1 block text-sm">{stage.detail}</span>
              {available && (
                <span className="text-primary mt-2 block text-sm">Schedule this exam</span>
              )}
            </span>
            {stage.state === ExamStageState.Passed ? (
              <Check size={18} aria-label="Passed" className="text-success shrink-0" />
            ) : available ? (
              <ArrowRight size={18} className="text-primary shrink-0" />
            ) : stage.state === ExamStageState.Locked ? (
              <Lock
                size={16}
                aria-label="Not yet memorized"
                className="text-muted-foreground shrink-0"
              />
            ) : null}
          </>
        );
        return (
          <li key={stage.stage}>
            {available ? (
              <button
                type="button"
                aria-label={`Schedule ${stage.label}`}
                onClick={() => onSchedule(stage)}
                className="hover:bg-muted flex min-h-24 w-full items-center gap-4 px-1 py-5 text-left transition-colors"
              >
                {content}
              </button>
            ) : (
              <div className="flex min-h-24 items-center gap-4 px-1 py-5">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
