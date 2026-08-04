import { cn } from "@/lib/utils";
import React from "react";
import { ErrorState } from "@/components/shared/error-state";

interface AnalyticsErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function AnalyticsError({ onRetry, className }: AnalyticsErrorProps) {
  return (
    <div className={cn("py-12", className)}>
      <ErrorState
        title="Could not load analytics"
        description="We were unable to retrieve your analytics data. Please try again."
        retryLabel="Retry"
        onRetry={onRetry}
      />
    </div>
  );
}
