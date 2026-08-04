import { cn } from "@/lib/utils";
import React from "react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { BookOpen, Play } from "lucide-react";
import Link from "next/link";
import type { TodaySessionDTO } from "@/types/dto";

interface TodaySessionCardProps {
  session?: TodaySessionDTO | null;
  className?: string;
}

export function TodaySessionCard({ session, className }: TodaySessionCardProps) {
  const hasAssignment = session && session.assignment;

  return (
    <article
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-primary-card",
        "flex h-full flex-col gap-5 p-5 md:p-6",
        "ring-1 ring-primary/10",
        className,
      )}
      aria-label="Today's Memorization Session"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Sabaq</h3>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              New Memorization
            </p>
          </div>
        </div>
        <StatusBadge status={session?.status === "in_progress" ? "info" : "neutral"}>
          {session?.status ? session.status.replace("_", " ") : "Not started"}
        </StatusBadge>
      </div>

      {/*
        Assignment.

        Surah leads and the page number supports it. A page number alone
        ("Page 53") is unusable without a Mushaf already open — the
        surah is what tells you where you are and whether the plan looks
        right. The Arabic name sits beside it because that is the name
        most people actually know the surah by.
      */}
      <div className="flex-1 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Current Assignment</p>
        {hasAssignment ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <p className="text-lg font-semibold leading-snug text-foreground">
                {session.assignment!.surah || session.assignment!.target || "Assignment ready"}
              </p>
              {session.assignment!.surahArabic && (
                <p lang="ar" dir="rtl" className="text-lg leading-snug text-muted-foreground">
                  {session.assignment!.surahArabic}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {session.assignment!.startPage === session.assignment!.endPage
                ? `Page ${session.assignment!.startPage}`
                : `Pages ${session.assignment!.startPage} — ${session.assignment!.endPage}`}
              {session.assignment!.juzNumber ? ` · Juz ${session.assignment!.juzNumber}` : ""}
            </p>
          </>
        ) : (
          <p className="text-lg font-semibold leading-snug text-foreground">
            No assignment scheduled
          </p>
        )}
      </div>

      {/* Progress */}
      <ProgressBar
        value={session?.progress.current ?? 0}
        max={session?.progress.total ?? 1}
        label="Progress"
        size="sm"
      />

      {/* CTA */}
      <Button className="w-full font-medium" asChild={!session}>
        {session ? (
          <span className="flex items-center justify-center gap-2">
            <Play className="h-4 w-4" aria-hidden="true" />
            {session?.status === "in_progress" ? "Continue Session" : "Start Session"}
          </span>
        ) : (
          <Link href="/session" className="flex items-center justify-center gap-2">
            <Play className="h-4 w-4" aria-hidden="true" />
            Go to Session
          </Link>
        )}
      </Button>
    </article>
  );
}
