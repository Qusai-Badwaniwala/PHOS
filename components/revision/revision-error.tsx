import { cn } from "@/lib/utils";
import React from "react";
import { ErrorState } from "@/components/shared/error-state";

interface RevisionErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function RevisionError({ onRetry, className }: RevisionErrorProps) {
  return (
    <div className={cn("py-12", className)}>
      <ErrorState
        title="Could not load revision"
        description="We were unable to prepare your revision session. Please try again."
        retryLabel="Retry"
        onRetry={onRetry}
      />
    </div>
  );
}
