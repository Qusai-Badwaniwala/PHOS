import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { BookOpen, RotateCcw, Database, Award, Settings } from "lucide-react";
import type { TimelineEntryDTO } from "@/types/dto";

export type HistoryTimelineEntry = TimelineEntryDTO;

interface HistoryTimelineProps {
  entries?: TimelineEntryDTO[];
  onSelect?: (entry: TimelineEntryDTO) => void;
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
    case "settings":
      return <Settings className={iconClass} />;
  }
}

export function HistoryTimeline({ entries, onSelect, className }: HistoryTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className={cn(className)}>
        <EmptyState
          title="No history yet"
          description="Complete sessions and revisions to build your activity history."
        />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="bg-border absolute top-2 bottom-2 left-4 w-px" aria-hidden="true" />
      <div className="space-y-0">
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect?.(entry)}
            className="hover:bg-accent/50 relative flex w-full gap-4 rounded-md py-3 pl-2 text-left transition-colors"
          >
            <div className="bg-background relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
              <TimelineIcon type={entry.type} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{entry.title}</p>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {entry.date} · {entry.time}
                </span>
              </div>
              {entry.description && (
                <p className="text-muted-foreground mt-0.5 truncate text-xs">{entry.description}</p>
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
          </button>
        ))}
      </div>
    </div>
  );
}
