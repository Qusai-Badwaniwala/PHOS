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
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
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
