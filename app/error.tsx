"use client";

import React from "react";
import { ErrorState } from "@/components/shared/error-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-12">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error occurred. Please try again or return to the Dashboard."
        retryLabel="Try Again"
        onRetry={reset}
      />
    </div>
  );
}
