import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { BookOpen, RotateCcw, Database, Award } from "lucide-react";
import type { TimelineEntryDTO } from "@/types/dto";

interface TimelineCardProps {
  entries?: TimelineEntryDTO[];
  className?: string;
}

function TimelineIcon({ type }: { type: TimelineEntryDTO["type"] }) {
  const iconClass = "h-4 w-4 text-muted-foreground";
  switch (type) {
    case "session":
      return <BookOpen className={iconClass} />;
    case "revision":
      return <RotateCcw className={iconClass} />;
    case "backup":
      return <Database className={iconClass} />;
    case "milestone":
      return <Award className={iconClass} />;
    default:
      return <BookOpen className={iconClass} />;
  }
}

export function TimelineCard({ entries, className }: TimelineCardProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className={cn(className)}>
        <h3 className="mb-4 text-lg font-semibold">Historical Activity</h3>
        <EmptyState
          title="No activity recorded"
          description="Your session and revision history will appear here."
        />
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <h3 className="mb-4 text-lg font-semibold">Historical Activity</h3>
      <div className="relative space-y-0">
        <div className="bg-border absolute top-2 bottom-2 left-4 w-px" aria-hidden="true" />
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="relative flex gap-4 pl-2">
              <div className="bg-background relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                <TimelineIcon type={entry.type} />
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{entry.title}</p>
                  <span className="text-muted-foreground text-xs tabular-nums">{entry.date}</span>
                </div>
                {entry.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">{entry.description}</p>
                )}
                {entry.status && (
                  <div className="mt-1">
                    <StatusBadge
                      status={
                        entry.status === "completed"
                          ? "completed"
                          : entry.status === "failed"
                            ? "error"
                            : "pending"
                      }
                    >
                      {entry.status}
                    </StatusBadge>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
