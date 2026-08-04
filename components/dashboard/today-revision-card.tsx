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
  className?: string;
}

export function TodayRevisionCard({ revision, className }: TodayRevisionCardProps) {
  const hasAssignment = revision && revision.assignment;

  return (
    <article
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-card",
        "flex h-full flex-col gap-5 p-5 md:p-6",
        className,
      )}
      aria-label="Today's Revision Session"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <RotateCcw className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Revision</h3>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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
        <p className="text-xs font-medium text-muted-foreground">Today&apos;s Queue</p>
        <p className="text-lg font-semibold leading-snug text-foreground">
          {hasAssignment
            ? `${revision!.assignment!.totalPages ?? revision!.assignment!.pages?.length ?? 0} pages scheduled`
            : "No pages scheduled"}
        </p>
        {revision?.assignment?.type && (
          <p className="text-sm text-muted-foreground">
            <span className="capitalize">{revision.assignment.type.replace("_", " ")}</span>
            {revision.assignment.surah ? ` · ${revision.assignment.surah}` : ""}
            {revision.assignment.juzNumber ? ` · Juz ${revision.assignment.juzNumber}` : ""}
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

      {/* CTA */}
      <Button variant="secondary" className="w-full font-medium" asChild={!revision}>
        {revision ? (
          <span className="flex items-center justify-center gap-2">
            <Play className="h-4 w-4" aria-hidden="true" />
            {revision?.status === "in_progress" ? "Continue Revision" : "Start Revision"}
          </span>
        ) : (
          <Link href="/revision" className="flex items-center justify-center gap-2">
            <Play className="h-4 w-4" aria-hidden="true" />
            Go to Revision
          </Link>
        )}
      </Button>
    </article>
  );
}
