"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Clock } from "lucide-react";

export type RevisionStatus = "not_started" | "in_progress" | "paused" | "completed" | "interrupted";

interface RevisionHeaderProps {
  title?: string;
  status: RevisionStatus;
  estimatedTime?: string;
  className?: string;
}

function statusLabel(status: RevisionStatus): string {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "interrupted":
      return "Interrupted";
  }
}

function statusVariant(
  status: RevisionStatus,
): "neutral" | "info" | "warning" | "success" | "error" {
  switch (status) {
    case "not_started":
      return "neutral";
    case "in_progress":
      return "info";
    case "paused":
      return "warning";
    case "completed":
      return "success";
    case "interrupted":
      return "error";
  }
}

export function RevisionHeader({
  title = "Revision Session",
  status,
  estimatedTime,
  className,
}: RevisionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        {/*
          `h2`, not `h1` — see `session-header.tsx` for the full reason.
          `TopNav` owns the page's single `h1`; this was the second, and
          the `h3` cards below it were left with no h2 above them.
        */}
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        <div className="flex items-center gap-3">
          <StatusBadge status={statusVariant(status)}>{statusLabel(status)}</StatusBadge>
          {estimatedTime && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />~{estimatedTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
