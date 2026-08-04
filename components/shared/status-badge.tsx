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
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
          : status === "warning" || status === "pending"
            ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            : status === "error"
              ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
              : status === "info"
                ? "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400"
                : /* neutral */ "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
