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
  /** Whether this is the work PHOS wants done first today. See the CTA below. */
  isPrimaryAction?: boolean;
  className?: string;
}

export function TodaySessionCard({
  session,
  isPrimaryAction = true,
  className,
}: TodaySessionCardProps) {
  const hasAssignment = session && session.assignment;

  return (
    <article
      className={cn(
        "bg-card text-card-foreground shadow-primary-card rounded-xl border",
        "flex h-full flex-col gap-5 p-5 md:p-6",
        "ring-primary/10 ring-1",
        className,
      )}
      aria-label="Today's Memorization Session"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <BookOpen className="text-primary h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-foreground text-base font-semibold">Sabaq</h3>
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
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
        <p className="text-muted-foreground text-xs font-medium">Current Assignment</p>
        {hasAssignment ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <p className="text-foreground text-lg leading-snug font-semibold">
                {session.assignment!.surah || session.assignment!.target || "Assignment ready"}
              </p>
              {session.assignment!.surahArabic && (
                <p lang="ar" dir="rtl" className="text-muted-foreground text-lg leading-snug">
                  {session.assignment!.surahArabic}
                </p>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {session.assignment!.startPage === session.assignment!.endPage
                ? `Page ${session.assignment!.startPage}`
                : `Pages ${session.assignment!.startPage} — ${session.assignment!.endPage}`}
              {session.assignment!.juzNumber ? ` · Juz ${session.assignment!.juzNumber}` : ""}
            </p>
          </>
        ) : (
          <p className="text-foreground text-lg leading-snug font-semibold">
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

      {/*
        CTA.

        Always a link, whatever the state. It previously rendered a bare
        `<span>` whenever a session existed — no href, no handler — so
        the button was dead in precisely the case where there was
        something to start, and worked only when there was nothing to
        do. It had been that way since the first commit; the flow stayed
        reachable through the sidebar, which is why it went unnoticed.

        Only the label varies. The destination never does.
      */}
      {/*
        Emphasis follows the day's real order, rather than being fixed.

        Both CTAs used to be hardcoded — Session filled, Revision
        secondary — directly above a line of the app's own guidance
        reading "Revision comes first so what you already know stays
        secure." The product's central claim was losing an argument with
        its own CSS on the screen people open every day, and visual
        weight is what users obey, not the paragraph.

        `isPrimaryAction` is computed once on the Dashboard and passed to
        both cards from the same value, so they can never both be filled
        and never both be quiet.
      */}
      <Button
        variant={isPrimaryAction ? "default" : "secondary"}
        className="w-full font-medium"
        asChild
      >
        <Link href="/session" className="flex items-center justify-center gap-2">
          <Play className="h-4 w-4" aria-hidden="true" />
          {!session
            ? "Go to Session"
            : session.status === "in_progress"
              ? "Continue Session"
              : "Start Session"}
        </Link>
      </Button>
    </article>
  );
}
