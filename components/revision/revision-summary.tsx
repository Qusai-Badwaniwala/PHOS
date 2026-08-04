import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, Clock, RotateCcw, ArrowRight } from "lucide-react";

interface RevisionSummaryProps {
  duration?: string;
  pagesRevised?: number;
  nextStep?: string;
  className?: string;
}

export function RevisionSummary({
  duration,
  pagesRevised,
  nextStep = "Continue with your daily routine",
  className,
}: RevisionSummaryProps) {
  return (
    <ContentCard
      className={cn("border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20", className)}
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle
            className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Revision Complete</h3>
          <p className="text-sm text-muted-foreground">Your revision progress has been recorded.</p>
        </div>

        <div className="grid w-full max-w-sm grid-cols-2 gap-4">
          {duration && (
            <div className="rounded-lg border bg-background p-3">
              <div className="mb-1 flex items-center justify-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Duration</span>
              </div>
              <p className="text-lg font-semibold tabular-nums">{duration}</p>
            </div>
          )}
          {pagesRevised !== undefined && (
            <div className="rounded-lg border bg-background p-3">
              <div className="mb-1 flex items-center justify-center gap-1 text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="text-xs">Pages</span>
              </div>
              <p className="text-lg font-semibold tabular-nums">{pagesRevised}</p>
            </div>
          )}
        </div>

        <div className="w-full max-w-sm rounded-lg border bg-background p-3">
          <p className="mb-1 text-xs text-muted-foreground">Recommended Next Step</p>
          <p className="text-sm font-medium">{nextStep}</p>
        </div>

        <Button asChild>
          <Link href="/dashboard">
            Return to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </ContentCard>
  );
}
