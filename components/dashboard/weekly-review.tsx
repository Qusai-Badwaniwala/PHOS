import React from "react";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/shared/content-card";
import { CalendarDays } from "lucide-react";
import type { WeeklyReviewDTO } from "@/types/dto";

interface WeeklyReviewCardProps {
  review?: WeeklyReviewDTO;
  className?: string;
}

/**
 * The week just gone, in the numbers that describe it.
 *
 * A quiet counterweight to a dashboard that otherwise only ever looks
 * forward at what is due. Someone who has studied every day for a month
 * deserves to see that somewhere, without it being turned into a streak
 * — the count resets each week and nothing is ever "broken".
 *
 * `trendSummary` is the Analytics Engine's own sentence, shown
 * verbatim. Rewording it here would produce a second, unverified
 * account of the user's progress.
 */
export function WeeklyReviewCard({ review, className }: WeeklyReviewCardProps) {
  if (!review) return null;

  const nothingRecorded =
    review.pagesCompleted === 0 && review.sessionsCompleted === 0 && review.recallsRecorded === 0;

  return (
    <ContentCard className={cn(className)} as="section">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold">Your week</h3>
      </div>

      {nothingRecorded ? (
        /*
          Said plainly rather than as three zeros. A row of noughts reads
          as a scoreboard; this reads as a fact, and a week away from
          PHOS is a normal part of a years-long journey.
        */
        <p className="text-sm text-muted-foreground">
          Nothing recorded in the last seven days. Whenever you pick it back up, PHOS will start
          from where you actually are.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3">
            {[
              { label: "Pages", value: review.pagesCompleted },
              { label: "Sessions", value: review.sessionsCompleted },
              { label: "Recalls", value: review.recallsRecorded },
            ].map((stat) => (
              <div key={stat.label}>
                <dd className="text-2xl font-semibold tabular-nums">{stat.value}</dd>
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>

          {review.trendSummary && (
            <p className="mt-3 text-sm text-muted-foreground">{review.trendSummary}</p>
          )}
        </>
      )}
    </ContentCard>
  );
}
