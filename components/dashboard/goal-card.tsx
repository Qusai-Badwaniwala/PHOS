import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { ProgressBar } from "@/components/shared/progress-bar";
import { Target } from "lucide-react";
import type { GoalCardDTO } from "@/types/dto";

interface GoalCardProps {
  goal?: GoalCardDTO | null;
  className?: string;
}

/**
 * The user's own goal, and where their real pace would take them.
 *
 * Deliberately quiet. There is no countdown, no colour that shifts from
 * green to red, and no exclamation anywhere — a projection landing
 * after the goal is information about pace, and dressing it as an alarm
 * would make PHOS the thing generating anxiety rather than the thing
 * absorbing it.
 *
 * When no goal is set the card invites one once and then stops asking.
 * Most people will never set a goal, and that is a complete answer.
 */
export function GoalCard({ goal, className }: GoalCardProps) {
  if (!goal) {
    return (
      <section aria-label="Your goal" className={cn("folio-section", className)}>
        <div className="flex gap-3">
          <Target className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-medium">Set a goal, if you want one</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Tell PHOS how many pages you want memorized and by when, and it will tell you where
              your real pace is heading.{" "}
              <Link href="/settings#goal" className="text-primary font-medium hover:underline">
                Set a goal
              </Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Your goal" className={cn("folio-section", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Target className="text-muted-foreground h-5 w-5" aria-hidden="true" />
        <h3 className="font-semibold">Your goal</h3>
      </div>

      <div className="space-y-3">
        <p className="text-foreground text-sm leading-relaxed">{goal.summary}</p>

        <ProgressBar
          value={goal.pagesMemorized}
          max={goal.targetPages}
          label={`${goal.pagesMemorized} of ${goal.targetPages} pages`}
          size="sm"
        />

        <p className="text-muted-foreground text-xs">
          Goal: {goal.targetPages} pages by {goal.targetDate}
        </p>

        {/*
          The second line exists chiefly to stop this card quietly
          reversing PHOS's retention-over-speed rule. Rendered quieter
          than the summary on purpose — it is context, not a warning.
        */}
        {goal.note && (
          <p className="border-border text-muted-foreground border-l-2 pl-3 text-xs leading-relaxed">
            {goal.note}
          </p>
        )}
      </div>
    </section>
  );
}
