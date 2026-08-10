import { cn } from "@/lib/utils";
import React from "react";

interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "neutral" | "pending" | "completed";
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        status === "success" || status === "completed"
          ? "bg-success-muted text-success"
          : status === "warning" || status === "pending"
            ? "bg-warning-muted text-warning"
            : status === "error"
              ? "bg-destructive/15 text-destructive"
              : status === "info"
                ? "bg-info-muted text-info"
                : /* neutral */ "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
