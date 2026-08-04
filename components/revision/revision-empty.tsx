import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RevisionEmptyProps {
  className?: string;
}

export function RevisionEmpty({ className }: RevisionEmptyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <EmptyState
        title="No revision scheduled"
        description="No pages are due for revision today. Continue with new memorization or rest."
      />
      <div className="flex justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
