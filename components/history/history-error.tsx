import { cn } from "@/lib/utils";
import React from "react";
import { ErrorState } from "@/components/shared/error-state";

interface HistoryErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function HistoryError({ onRetry, className }: HistoryErrorProps) {
  return (
    <div className={cn("py-12", className)}>
      <ErrorState
        title="Could not load history"
        description="We were unable to retrieve your activity history. Please try again."
        retryLabel="Retry"
        onRetry={onRetry}
      />
    </div>
  );
}
