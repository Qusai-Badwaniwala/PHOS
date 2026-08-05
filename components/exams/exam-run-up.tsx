"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/shared/content-card";
import { CalendarClock, Info } from "lucide-react";
import type { ExamRunUpDTO } from "@/types/dto";

interface ExamRunUpCardProps {
  runUp: ExamRunUpDTO;
  onMarkPassed: () => void;
  onCancel: () => void;
  pending?: boolean;
  className?: string;
}

/**
 * The exam currently being prepared for.
 *
 * Three things have to be visible at once, and the order matters:
 * what today asks, when the exam is, and what PHOS has set aside to
 * make room. The third is the one most easily forgotten and the one
 * most likely to be read as a bug — a user whose usual revision has
 * vanished needs to be told that on the same card, not in a guide.
 */
export function ExamRunUpCard({
  runUp,
  onMarkPassed,
  onCancel,
  pending = false,
  className,
}: ExamRunUpCardProps) {
  const [showSchedule, setShowSchedule] = React.useState(false);

  return (
    <ContentCard className={cn(className)}>
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="font-semibold">Exam preparation</h3>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium">{runUp.summary}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {runUp.pagesInScope} pages in scope, about {runUp.pagesPerDay} a day.
          </p>
        </div>

        <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="mt-0.5 text-sm font-medium">{runUp.todaysRange}</p>
        </div>

        {/*
          Never softened and never hidden. A student who discovers on the
          day that the schedule never fit has been failed by the tool,
          not by their own planning.
        */}
        {runUp.budgetWarning && (
          <p className="rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {runUp.budgetWarning}
          </p>
        )}

        <div className="flex gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">{runUp.setAsideNote}</p>
        </div>

        {runUp.coverage.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowSchedule((open) => !open)}
              aria-expanded={showSchedule}
              className="text-xs font-medium text-primary hover:underline"
            >
              {showSchedule ? "Hide the full schedule" : "See the full schedule"}
            </button>

            {showSchedule && (
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
                {runUp.coverage.map((day) => (
                  <li
                    key={day.date}
                    className="flex justify-between gap-3 border-b border-border/50 py-1 text-xs last:border-0"
                  >
                    <span className="text-muted-foreground">{day.date}</span>
                    <span className="text-right font-medium">
                      {day.pageNumbers.length === 0
                        ? "—"
                        : day.pageNumbers.length === 1
                          ? `Page ${day.pageNumbers[0]}`
                          : `${day.pageNumbers[0]}–${day.pageNumbers[day.pageNumbers.length - 1]}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={onMarkPassed}>
            I passed this exam
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={onCancel}>
            Cancel exam
          </Button>
        </div>
      </div>
    </ContentCard>
  );
}
