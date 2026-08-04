import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { EmptyState } from "@/components/shared/empty-state";
import { BookOpen } from "lucide-react";
import { StudyPageList } from "@/components/shared/study-page-list";
import type { SessionDTO, StudyPageDTO } from "@/types/dto";

interface AssignmentCardProps {
  assignment?: SessionDTO["assignment"];
  /** The individual pages, so each can be named by its surahs. */
  studyPages?: StudyPageDTO[];
  className?: string;
}

export function AssignmentCard({ assignment, studyPages = [], className }: AssignmentCardProps) {
  const hasAssignment = assignment && (assignment.surah || assignment.target);

  return (
    <ContentCard className={cn("h-full", className)}>
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold">Assignment</h3>
      </div>

      {hasAssignment ? (
        <div className="space-y-3">
          {assignment.surah && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Surah</p>
              <p className="text-lg font-medium">{assignment.surah}</p>
            </div>
          )}
          {(assignment.startPage || assignment.endPage) && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pages</p>
              <p className="text-base">
                {assignment.startPage} — {assignment.endPage}
              </p>
            </div>
          )}
          {studyPages.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                What to memorize
              </p>
              <StudyPageList pages={studyPages} />
            </div>
          )}
          {studyPages.length === 0 && assignment.target && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Target</p>
              <p className="text-base">{assignment.target}</p>
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
          title="No assignment"
          description="Start a session to receive today's memorization assignment."
        />
      )}
    </ContentCard>
  );
}
