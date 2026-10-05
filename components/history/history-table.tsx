import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { BookOpen, RotateCcw, Database, Award, Settings } from "lucide-react";
import type { TimelineEntryDTO } from "@/types/dto";

interface HistoryTableProps {
  entries?: TimelineEntryDTO[];
  onSelect?: (entry: TimelineEntryDTO) => void;
  className?: string;
}

function TableIcon({ type }: { type: TimelineEntryDTO["type"] }) {
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

export function HistoryTable({ entries, onSelect, className }: HistoryTableProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className={cn(className)}>
        <EmptyState
          title="No entries"
          description="Your activity will appear here once recorded."
        />
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Activity</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Date</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((entry) => (
            <tr
              key={entry.id}
              onClick={() => onSelect?.(entry)}
              className="hover:bg-accent/50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <TableIcon type={entry.type} />
                  <span className="capitalize">{entry.type}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="min-h-11 w-full rounded-sm py-1 text-left"
                  aria-label={`Open ${entry.title}, ${entry.date}`}
                  disabled={!onSelect}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect?.(entry);
                  }}
                >
                  <span className="block font-medium">{entry.title}</span>
                  {entry.description && (
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {entry.description}
                    </span>
                  )}
                  <span className="text-muted-foreground mt-1 block text-xs sm:hidden">
                    {entry.date} · {entry.time}
                  </span>
                </button>
              </td>
              <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{entry.date}</td>
              <td className="hidden px-4 py-3 md:table-cell">
                {entry.status && (
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
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
