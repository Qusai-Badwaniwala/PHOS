"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Clock } from "lucide-react";

export type SessionStatus = "not_started" | "in_progress" | "paused" | "completed" | "interrupted";

interface SessionHeaderProps {
  title?: string;
  status: SessionStatus;
  estimatedTime?: string;
  className?: string;
}

function statusLabel(status: SessionStatus): string {
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
  status: SessionStatus,
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

export function SessionHeader({
  title = "Memorization Session",
  status,
  estimatedTime,
  className,
}: SessionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        {/*
          `h2`, not `h1`. `TopNav` already emits the page's only `h1`
          ("Memorization"), so this rendered a second one — and the cards
          below are `h3`, which made the outline h1 → h1 → h3 with no h2
          between them. A screen reader navigating by heading level got
          two competing page titles and then a skipped rank on the two
          screens a user opens every day.
        */}
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        <div className="flex items-center gap-3">
          <StatusBadge status={statusVariant(status)}>{statusLabel(status)}</StatusBadge>
          {estimatedTime && (
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />~{estimatedTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
