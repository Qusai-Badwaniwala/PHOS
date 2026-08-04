"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";

export type ActivityFilter = "all" | "session" | "revision" | "backup" | "milestone" | "settings";
export type StatusFilter = "all" | "completed" | "pending" | "failed";

interface HistoryFiltersProps {
  activityType: ActivityFilter;
  status: StatusFilter;
  onActivityChange: (type: ActivityFilter) => void;
  onStatusChange: (status: StatusFilter) => void;
  className?: string;
}

export function HistoryFilters({
  activityType,
  status,
  onActivityChange,
  onStatusChange,
  className,
}: HistoryFiltersProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)} className="gap-2">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </Button>

      {expanded && (
        <>
          <Select value={activityType} onValueChange={(v) => onActivityChange(v as ActivityFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="revision">Revision</SelectItem>
              <SelectItem value="backup">Backup</SelectItem>
              <SelectItem value="milestone">Milestone</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}
