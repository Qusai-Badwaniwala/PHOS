"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getExamOverview } from "@/lib/api/exams";
import { GraduationCap } from "lucide-react";
import type { ExamRunUpDTO } from "@/types/dto";

interface ExamModeStripProps {
  className?: string;
}

/**
 * A single line on the Dashboard while an exam is being prepared for.
 *
 * Exams live on their own screen now, but exam mode replaces the day's
 * plan outright — ordinary revision disappears, weak pages stop being
 * surfaced. That change has to be explained *where it happens*. A user
 * who opens the Dashboard, finds their usual revision gone, and has to
 * remember that a different screen explains why has been failed by the
 * layout.
 *
 * Renders nothing at all when no exam is scheduled, which is almost
 * always.
 */
export function ExamModeStrip({ className }: ExamModeStripProps) {
  const [runUp, setRunUp] = React.useState<ExamRunUpDTO | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void getExamOverview()
      .then((overview) => {
        if (!cancelled) setRunUp(overview.runUp);
      })
      // Silent: this is context for the plan, and losing it must never
      // take the Dashboard down with it.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!runUp) return null;

  return (
    <Link
      href="/exams"
      className={cn(
        "flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10",
        className,
      )}
    >
      <GraduationCap className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Exam preparation · {runUp.summary}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Today: {runUp.todaysRange}. Revision outside this exam is paused until you mark it passed.
        </p>
      </div>
      <span className="shrink-0 text-xs font-medium text-primary">View</span>
    </Link>
  );
}
