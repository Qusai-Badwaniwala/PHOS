"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/shared/content-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatPageList } from "@/lib/format";
import type { ExamRunUpDTO } from "@/types/dto";
export function ExamRunUpCard({
  runUp,
  onMarkPassed,
  onCancel,
  pending = false,
  className,
}: {
  runUp: ExamRunUpDTO;
  onMarkPassed: () => void;
  onCancel: () => void;
  pending?: boolean;
  className?: string;
}) {
  const [showSchedule, setShowSchedule] = React.useState(false);
  const [action, setAction] = React.useState<"passed" | "cancel" | null>(null);
  return (
    <ContentCard className={className}>
      <p className="eyebrow">Your exam preparation</p>
      <h2 className="mt-3 font-serif text-2xl">{runUp.summary}</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {runUp.pagesInScope} pages in scope · about {runUp.pagesPerDay} a day
      </p>
      <div className="border-primary my-6 border-l-2 pl-5">
        <p className="eyebrow">Today’s coverage</p>
        <p className="mt-2 text-xl font-medium">{runUp.todaysRange}</p>
      </div>
      {runUp.budgetWarning && <p className="text-warning mb-4 text-sm">{runUp.budgetWarning}</p>}
      <p className="text-muted-foreground mb-5 text-sm">{runUp.setAsideNote}</p>
      <Button asChild>
        <Link href="/revision">Open today’s revision</Link>
      </Button>
      {runUp.coverage.length > 0 && (
        <div className="mt-5">
          <Button
            variant="ghost"
            onClick={() => setShowSchedule(!showSchedule)}
            aria-expanded={showSchedule}
          >
            {showSchedule ? "Hide the full schedule" : "See the full schedule"}
          </Button>
          {showSchedule && (
            <ul className="tab-panel mt-3 max-h-80 divide-y overflow-y-auto border-y">
              {runUp.coverage.map((day) => (
                <li key={day.date} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
                  <span className="text-muted-foreground">{day.date}</span>
                  <span className="text-right">
                    {day.pageNumbers.length
                      ? formatPageList(day.pageNumbers)
                      : "No pages scheduled"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
        <Button variant="outline" disabled={pending} onClick={() => setAction("passed")}>
          I passed this exam
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setAction("cancel")}>
          Cancel exam
        </Button>
      </div>
      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "passed"
                ? "Record this exam as passed?"
                : "Cancel this exam preparation?"}
            </DialogTitle>
            <DialogDescription>
              {action === "passed"
                ? "The exam becomes part of your history. PHOS returns to ordinary revision and shows what needs attention outside the exam scope."
                : "PHOS returns to ordinary revision. Your learned pages and study history are preserved."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Go back
            </Button>
            <Button
              onClick={() => {
                if (action === "passed") onMarkPassed();
                else onCancel();
                setAction(null);
              }}
            >
              {action === "passed" ? "Record passed exam" : "Cancel preparation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentCard>
  );
}
