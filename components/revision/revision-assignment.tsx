import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { EmptyState } from "@/components/shared/empty-state";
import { RotateCcw } from "lucide-react";
import { StudyPageList } from "@/components/shared/study-page-list";
import type { RevisionDTO, StudyPageDTO } from "@/types/dto";

interface RevisionAssignmentProps {
  assignment?: RevisionDTO["assignment"];
  /** The individual pages, so each can be named by its surahs. */
  studyPages?: StudyPageDTO[];
  className?: string;
}

function typeLabel(type: string): string {
  switch (type) {
    case "sabqi":
      return "Sabqi — Recent Revision";
    case "manzil":
      return "Manzil — Long-term Revision";
    case "recovery":
      return "Recovery — Targeted Reinforcement";
    default:
      return "Revision";
  }
}

export function RevisionAssignment({
  assignment,
  studyPages = [],
  className,
}: RevisionAssignmentProps) {
  const hasAssignment = assignment && (assignment.pages || assignment.type);

  return (
    <ContentCard className={cn("h-full", className)}>
      <div className="mb-4 flex items-center gap-2">
        <RotateCcw className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold">Assignment</h3>
      </div>

      {hasAssignment ? (
        <div className="space-y-3">
          {assignment.type && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Type</p>
              <p className="text-base font-medium">{typeLabel(assignment.type)}</p>
            </div>
          )}
          {studyPages.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                What to revise
              </p>
              <StudyPageList pages={studyPages} />
            </div>
          ) : (
            assignment.pages &&
            assignment.pages.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Pages</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {assignment.pages.map((page) => (
                    <span
                      key={page}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium"
                    >
                      {page}
                    </span>
                  ))}
                </div>
              </div>
            )
          )}
          {assignment.totalPages !== undefined && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="text-base">{assignment.totalPages} pages</p>
            </div>
          )}
          {assignment.notes && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">{assignment.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No revision scheduled"
          description="Start a revision session to see today's assigned portions."
        />
      )}
    </ContentCard>
  );
}
