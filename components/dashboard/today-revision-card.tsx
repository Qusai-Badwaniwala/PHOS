import { cn } from "@/lib/utils";
import React from "react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { RotateCcw, Play } from "lucide-react";
import Link from "next/link";
import type { TodayRevisionDTO } from "@/types/dto";

interface TodayRevisionCardProps {
  revision?: TodayRevisionDTO | null;
  /** Whether this is the work PHOS wants done first today. See the CTA below. */
  isPrimaryAction?: boolean;
  className?: string;
}

export function TodayRevisionCard({
  revision,
  isPrimaryAction = false,
  className,
}: TodayRevisionCardProps) {
  const hasAssignment = revision && revision.assignment;

  return (
    <article
      className={cn(
        "bg-card text-card-foreground shadow-card rounded-xl border",
        "flex h-full flex-col gap-5 p-5 md:p-6",
        className,
      )}
      aria-label="Today's Revision Session"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <RotateCcw className="text-muted-foreground h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-foreground text-base font-semibold">Revision</h3>
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Dhor &amp; Sabqi
            </p>
          </div>
        </div>
        <StatusBadge status={revision?.status === "in_progress" ? "info" : "neutral"}>
          {revision?.status ? revision.status.replace("_", " ") : "Not started"}
        </StatusBadge>
      </div>

      {/* Assignment */}
      <div className="flex-1 space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium">Today&apos;s Queue</p>
        <p className="text-foreground text-lg leading-snug font-semibold">
          {hasAssignment
            ? `${revision!.assignment!.totalPages ?? revision!.assignment!.pages?.length ?? 0} pages scheduled`
            : "No pages scheduled"}
        </p>
        {revision?.assignment?.type && (
          <p className="text-muted-foreground text-sm">
            <span className="capitalize">{revision.assignment.type.replace("_", " ")}</span>
            {/*
              `surah` and `juzNumber` are present only when the pages are
              genuinely consecutive. For a scattered assignment — the
              normal case — the Juz list is the honest summary, because
              a range would name pages the user has not been asked to
              revise. The exact page numbers are on the Revision page.
            */}
            {revision.assignment.surah ? ` · ${revision.assignment.surah}` : ""}
            {revision.assignment.juzNumber ? ` · Juz ${revision.assignment.juzNumber}` : ""}
            {!revision.assignment.surah && revision.assignment.juzCovered?.length
              ? ` · Juz ${revision.assignment.juzCovered.join(", ")}`
              : ""}
          </p>
        )}
      </div>

      {/* Progress */}
      <ProgressBar
        value={revision?.progress.current ?? 0}
        max={revision?.progress.total ?? 1}
        label="Progress"
        size="sm"
      />

      {/*
        CTA. See `today-session-card.tsx` — this carried the identical
        inverted condition, dead exactly when there was revision waiting.
      */}
      {/* See `today-session-card.tsx`: emphasis follows the day's real
          order, from one shared value. */}
      <Button
        variant={isPrimaryAction ? "default" : "secondary"}
        className="w-full font-medium"
        asChild
      >
        <Link href="/revision" className="flex items-center justify-center gap-2">
          <Play className="h-4 w-4" aria-hidden="true" />
          {!revision
            ? "Go to Revision"
            : revision.status === "in_progress"
              ? "Continue Revision"
              : "Start Revision"}
        </Link>
      </Button>
    </article>
  );
}
